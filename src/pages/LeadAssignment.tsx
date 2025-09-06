import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSalespeopleData } from "@/hooks/useSalespeopleData";
import { LeadSearchComponent } from "@/components/lead-assignment/LeadSearchComponent";

interface Lead {
  id: string;
  nome: string;
  cognome?: string;
  email?: string;
  telefono?: string;
  fonte?: string;
  lead_score?: string;
  created_at: string;
  venditore?: string;
  stato?: string;
}

const LeadAssignment = () => {
  console.log("🔍 LeadAssignment component rendering...");
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedVenditore, setSelectedVenditore] = useState("");
  const [selectedCampagna, setSelectedCampagna] = useState("");
  const [campagne, setCampagne] = useState<Array<{id: string, nome: string}>>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentSuccess, setAssignmentSuccess] = useState<{
    leadName: string;
    venditoreName: string;
    leadSource: string;
  } | null>(null);
  
  const { venditori, isLoading } = useSalespeopleData();
  console.log("👥 Venditori loaded:", venditori.length, "Loading:", isLoading);

  const handleLeadFound = (lead: Lead) => {
    setSelectedLead(lead);
    setAssignmentSuccess(null); // Reset success message when new lead is selected
  };

  // Carica le campagne disponibili
  useEffect(() => {
    console.log("📋 Loading campaigns...");
    const fetchCampagne = async () => {
      try {
        const { data, error } = await supabase
          .from('database_campagne')
          .select('id, nome')
          .eq('attivo', true)
          .order('nome');
        
        if (error) throw error;
        setCampagne(data || []);
        console.log("📋 Campaigns loaded:", data?.length || 0);
      } catch (error) {
        console.error('Errore caricamento campagne:', error);
      }
    };

    fetchCampagne();
  }, []);

  const handleAssignment = async () => {
    if (!selectedLead) {
      toast.error("Prima cerca e seleziona un lead");
      return;
    }

    if (!selectedVenditore) {
      toast.error("Seleziona un venditore");
      return;
    }

    if (selectedLead.venditore) {
      toast.error("Questo lead è già assegnato a " + selectedLead.venditore);
      return;
    }

    const venditoreData = venditori.find(v => v.id === selectedVenditore);
    if (!venditoreData) {
      toast.error("Venditore non trovato");
      return;
    }

    setIsAssigning(true);
    try {
      const venditoreName = `${venditoreData.nome} ${venditoreData.cognome}`.trim();
      
      // Aggiorna il lead con l'assegnazione
      const { error: updateError } = await supabase
        .from('lead_generation')
        .update({
          venditore: venditoreName,
          campagna: selectedCampagna || null,
          stato: 'assegnato',
          data_assegnazione: new Date().toISOString(),
          assignable: false
        })
        .eq('id', selectedLead.id);

      if (updateError) throw updateError;

      // Registra in cronologia
      const { error: historyError } = await supabase
        .from('assignment_history')
        .insert({
          venditore: venditoreName,
          leads_count: 1,
          campagna: selectedCampagna || null,
          fonti_escluse: null
        });

      if (historyError) {
        console.error('Errore nella registrazione cronologia:', historyError);
      }

      // Invia webhook
      const { data: webhookData, error: webhookError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'lead_assign_webhook_url')
        .single();

      if (!webhookError && webhookData?.value) {
        console.log('Invio webhook per assegnazione tramite ricerca...');
        
        const assignmentPayload = {
          venditore: venditoreData.nome,
          venditore_cognome: venditoreData.cognome || '',
          venditore_email: venditoreData.email || '',
          venditore_telefono: venditoreData.telefono || '',
          google_sheets_file_id: venditoreData.sheets_file_id || '',
          google_sheets_tab_name: venditoreData.sheets_tab_name || '',
          campagna: selectedCampagna || null,
          leads_count: 1,
          timestamp: new Date().toISOString(),
          leads: [{
            id: selectedLead.id,
            nome: selectedLead.nome,
            cognome: selectedLead.cognome || '',
            email: selectedLead.email || '',
            telefono: selectedLead.telefono || '',
            fonte: selectedLead.fonte || '',
            created_at: selectedLead.created_at,
            assigned_at: new Date().toISOString()
          }]
        };

        try {
          const { data: webhookResponse, error: webhookCallError } = await supabase.functions.invoke('lead-assign-webhook', {
            body: {
              assignmentData: assignmentPayload,
              webhookUrl: webhookData.value
            }
          });

          if (webhookCallError) {
            console.error('Errore chiamata webhook:', webhookCallError);
            toast.error('Lead assegnato ma errore nell\'invio del webhook');
          } else if (webhookResponse && webhookResponse.success) {
            console.log('Webhook inviato con successo:', webhookResponse);
            toast.success(`Lead assegnato a ${venditoreName} e webhook inviato`);
          } else {
            console.error('Webhook response indica errore:', webhookResponse);
            toast.success(`Lead assegnato a ${venditoreName} ma errore webhook`);
          }
        } catch (webhookError) {
          console.error('Errore nell\'invio webhook:', webhookError);
          toast.success(`Lead assegnato a ${venditoreName} ma errore webhook`);
        }
      } else {
        console.log('Webhook non configurato');
        toast.success(`Lead assegnato a ${venditoreName}`);
      }

      // Mostra messaggio di successo con dettagli
      setAssignmentSuccess({
        leadName: `${selectedLead.nome} ${selectedLead.cognome || ''}`.trim(),
        venditoreName: venditoreName,
        leadSource: selectedLead.fonte || 'Non specificata'
      });

      // Aggiorna conteggio lead attuali del venditore
      const { data: currentVenditore } = await supabase
        .from('venditori')
        .select('lead_attuali')
        .eq('id', selectedVenditore)
        .single();

      if (currentVenditore) {
        const newLeadCount = (currentVenditore.lead_attuali || 0) + 1;
        await supabase
          .from('venditori')
          .update({ lead_attuali: newLeadCount })
          .eq('id', selectedVenditore);
      }

      // Reset form
      setSelectedLead(null);
      setSelectedVenditore("");
      setSelectedCampagna("");
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setAssignmentSuccess(null);
      }, 5000);
    } catch (error) {
      console.error("Errore nell'assegnazione:", error);
      toast.error("Errore nell'assegnazione del lead");
    } finally {
      setIsAssigning(false);
    }
  };

  console.log("🎨 About to render LeadAssignment UI...");
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          {assignmentSuccess && (
            <Alert className="bg-green-50 border-green-200 animate-in slide-in-from-top duration-300">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-1">
                  <p className="font-semibold">✅ Lead assegnato con successo!</p>
                  <p><strong>Lead:</strong> {assignmentSuccess.leadName}</p>
                  <p><strong>Assegnato a:</strong> {assignmentSuccess.venditoreName}</p>
                  <p><strong>Fonte:</strong> {assignmentSuccess.leadSource}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Card className="shadow-xl border-0 bg-card/95 backdrop-blur-sm">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl font-bold">Assegnazione Lead</CardTitle>
              <p className="text-muted-foreground text-sm">Cerca un lead specifico e assegnalo a un venditore</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Componente di ricerca lead */}
              <LeadSearchComponent onLeadFound={handleLeadFound} />

              <div className="space-y-2">
                <Label>Seleziona Venditore</Label>
                <Select 
                  value={selectedVenditore} 
                  onValueChange={setSelectedVenditore}
                  disabled={isLoading || isAssigning}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli un venditore..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {venditori.map((venditore) => (
                      <SelectItem key={venditore.id} value={venditore.id}>
                        {venditore.nome} {venditore.cognome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Campagna (Opzionale)</Label>
                <Select 
                  value={selectedCampagna} 
                  onValueChange={setSelectedCampagna}
                  disabled={isAssigning}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona campagna (opzionale)..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    <SelectItem value="">Nessuna campagna</SelectItem>
                    {campagne.map((campagna) => (
                      <SelectItem key={campagna.id} value={campagna.nome}>
                        {campagna.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleAssignment}
                disabled={isAssigning || !selectedLead || !selectedVenditore}
                className="w-full"
              >
                {isAssigning ? "Assegnazione..." : "Assegna Lead"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LeadAssignment;