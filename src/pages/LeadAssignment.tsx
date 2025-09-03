import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSalespeopleData } from "@/hooks/useSalespeopleData";

const LeadAssignment = () => {
  const [email, setEmail] = useState("");
  const [selectedVenditore, setSelectedVenditore] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  
  const { venditori, isLoading } = useSalespeopleData();

  const handleAssignment = async () => {
    if (!email.trim()) {
      toast.error("Inserisci l'email del lead");
      return;
    }

    if (!selectedVenditore) {
      toast.error("Seleziona un venditore");
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
      
      // Trova il lead tramite email
      const { data: leadData, error: fetchError } = await supabase
        .from('lead_generation')
        .select('*')
        .eq('email', email.trim())
        .single();

      if (fetchError || !leadData) {
        toast.error("Lead non trovato con questa email");
        return;
      }

      // Aggiorna il lead con l'assegnazione
      const { error: updateError } = await supabase
        .from('lead_generation')
        .update({
          venditore: venditoreName,
          stato: 'assegnato',
          data_assegnazione: new Date().toISOString(),
          assignable: false
        })
        .eq('id', leadData.id);

      if (updateError) throw updateError;

      // Registra in cronologia
      const { error: historyError } = await supabase
        .from('assignment_history')
        .insert({
          venditore: venditoreName,
          leads_count: 1,
          campagna: null,
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
        console.log('Invio webhook per assegnazione tramite email...');
        
        const assignmentPayload = {
          venditore: venditoreData.nome,
          venditore_cognome: venditoreData.cognome || '',
          venditore_email: venditoreData.email || '',
          venditore_telefono: venditoreData.telefono || '',
          google_sheets_file_id: venditoreData.sheets_file_id || '',
          google_sheets_tab_name: venditoreData.sheets_tab_name || '',
          campagna: '',
          leads_count: 1,
          timestamp: new Date().toISOString(),
          leads: [{
            id: leadData.id,
            nome: leadData.nome,
            cognome: leadData.cognome || '',
            email: leadData.email || '',
            telefono: leadData.telefono || '',
            fonte: leadData.fonte || '',
            created_at: leadData.created_at,
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
            toast.error('Lead assegnato ma errore nell\'invio del webhook');
          }
        } catch (webhookError) {
          console.error('Errore nell\'invio webhook:', webhookError);
          toast.error('Lead assegnato ma errore nell\'invio del webhook');
        }
      } else {
        console.log('Webhook non configurato');
        toast.success(`Lead assegnato a ${venditoreName}`);
      }

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
      setEmail("");
      setSelectedVenditore("");
    } catch (error) {
      console.error("Errore nell'assegnazione:", error);
      toast.error("Errore nell'assegnazione del lead");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold">Assegnazione Lead</CardTitle>
            <p className="text-muted-foreground text-sm">Inserisci l'email per assegnare il lead</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email del Lead</Label>
              <Input
                id="email"
                type="email"
                placeholder="Inserisci l'email del lead..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isAssigning}
              />
            </div>

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

            <Button 
              onClick={handleAssignment}
              disabled={isAssigning || !email.trim() || !selectedVenditore}
              className="w-full"
            >
              {isAssigning ? "Assegnazione..." : "Assegna Lead"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeadAssignment;