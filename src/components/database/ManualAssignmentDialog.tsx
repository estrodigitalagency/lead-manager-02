
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Campaign {
  id: string;
  nome: string;
  descrizione?: string;
  attivo: boolean;
}

interface Venditore {
  id: string;
  nome: string;
  cognome: string;
  email?: string;
  telefono?: string;
  sheets_file_id?: string;
  sheets_tab_name?: string;
}

interface ManualAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeadIds: string[];
  onAssignmentComplete: () => void;
}

const ManualAssignmentDialog = ({
  open,
  onOpenChange,
  selectedLeadIds,
  onAssignmentComplete
}: ManualAssignmentDialogProps) => {
  const [selectedVenditore, setSelectedVenditore] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [venditori, setVenditori] = useState<Venditore[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [sendWebhook, setSendWebhook] = useState(false);

  useEffect(() => {
    if (open) {
      fetchVenditori();
      fetchCampaigns();
    }
  }, [open]);

  const fetchVenditori = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('venditori')
        .select('id, nome, cognome, email, telefono, sheets_file_id, sheets_tab_name')
        .eq('stato', 'attivo')
        .order('nome');
      
      if (error) throw error;
      setVenditori(data || []);
    } catch (error) {
      console.error("Errore nel caricamento venditori:", error);
      toast.error("Errore nel caricamento venditori");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('database_campagne')
        .select('id, nome, descrizione, attivo')
        .eq('attivo', true)
        .order('nome');
      
      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Errore nel caricamento campagne:", error);
      toast.error("Errore nel caricamento campagne");
    }
  };

  const handleAssign = async () => {
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
      
      // Recupera i dati dei lead selezionati prima dell'aggiornamento
      const { data: leadsData, error: fetchError } = await supabase
        .from('lead_generation')
        .select('*')
        .in('id', selectedLeadIds);

      if (fetchError) throw fetchError;

      // Aggiorna i lead con l'assegnazione
      const { error } = await supabase
        .from('lead_generation')
        .update({
          venditore: venditoreName,
          stato: 'assegnato',
          data_assegnazione: new Date().toISOString(),
          assignable: false
        })
        .in('id', selectedLeadIds);

      if (error) throw error;

      // Registra in cronologia
      const { error: historyError } = await supabase
        .from('assignment_history')
        .insert({
          venditore: venditoreName,
          leads_count: selectedLeadIds.length,
          campagna: selectedCampaign || null,
          fonti_escluse: null
        });

      if (historyError) {
        console.error('Errore nella registrazione cronologia:', historyError);
      }

      // Invia webhook solo se l'opzione è abilitata
      if (sendWebhook) {
        const { data: webhookData, error: webhookError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'lead_assign_webhook_url')
          .single();

        if (!webhookError && webhookData?.value && leadsData) {
          console.log('Invio webhook per assegnazione manuale...');
          
          const assignmentPayload = {
            venditore: venditoreData.nome,
            venditore_cognome: venditoreData.cognome || '',
            venditore_email: venditoreData.email || '',
            venditore_telefono: venditoreData.telefono || '',
            google_sheets_file_id: venditoreData.sheets_file_id || '',
            google_sheets_tab_name: venditoreData.sheets_tab_name || '',
            campagna: selectedCampaign || '',
            leads_count: selectedLeadIds.length,
            timestamp: new Date().toISOString(),
            leads: leadsData.map(lead => ({
              id: lead.id,
              nome: lead.nome,
              cognome: lead.cognome || '',
              email: lead.email || '',
              telefono: lead.telefono || '',
              fonte: lead.fonte || '',
              created_at: lead.created_at,
              assigned_at: new Date().toISOString()
            }))
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
              toast.error('Lead assegnati ma errore nell\'invio del webhook');
            } else if (webhookResponse && webhookResponse.success) {
              console.log('Webhook inviato con successo:', webhookResponse);
              toast.success(`${selectedLeadIds.length} lead assegnati a ${venditoreName} e webhook inviato`);
            } else {
              console.error('Webhook response indica errore:', webhookResponse);
              toast.error('Lead assegnati ma errore nell\'invio del webhook');
            }
          } catch (webhookError) {
            console.error('Errore nell\'invio webhook:', webhookError);
            toast.error('Lead assegnati ma errore nell\'invio del webhook');
          }
        } else {
          console.log('Webhook non configurato o non abilitato');
          toast.success(`${selectedLeadIds.length} lead assegnati a ${venditoreName}`);
        }
      } else {
        toast.success(`${selectedLeadIds.length} lead assegnati a ${venditoreName}`);
      }

      // Aggiorna conteggio lead attuali del venditore
      if (venditoreData) {
        const { data: currentVenditore } = await supabase
          .from('venditori')
          .select('lead_attuali')
          .eq('id', selectedVenditore)
          .single();

        if (currentVenditore) {
          const newLeadCount = (currentVenditore.lead_attuali || 0) + selectedLeadIds.length;
          await supabase
            .from('venditori')
            .update({ lead_attuali: newLeadCount })
            .eq('id', selectedVenditore);
        }
      }

      onAssignmentComplete();
      onOpenChange(false);
      setSelectedVenditore("");
      setSelectedCampaign("");
      setSendWebhook(false);
    } catch (error) {
      console.error("Errore nell'assegnazione:", error);
      toast.error("Errore nell'assegnazione dei lead");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleWebhookToggle = (checked: boolean | "indeterminate") => {
    setSendWebhook(checked === true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assegnazione Manuale Lead</DialogTitle>
          <DialogDescription>
            Assegna {selectedLeadIds.length} lead selezionati a un venditore
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Seleziona Venditore</label>
            <Select 
              value={selectedVenditore} 
              onValueChange={setSelectedVenditore}
              disabled={isLoading}
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
            <label className="text-sm font-medium">Campagna (opzionale)</label>
            <Select 
              value={selectedCampaign} 
              onValueChange={setSelectedCampaign}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Scegli una campagna..." />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                <SelectItem value="">Nessuna campagna</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.nome}>
                    {campaign.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="send-webhook"
              checked={sendWebhook}
              onCheckedChange={handleWebhookToggle}
            />
            <label
              htmlFor="send-webhook"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Invia dati anche via webhook
            </label>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isAssigning}
          >
            Annulla
          </Button>
          <Button 
            onClick={handleAssign}
            disabled={isAssigning || !selectedVenditore}
          >
            {isAssigning ? "Assegnazione..." : "Assegna Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualAssignmentDialog;
