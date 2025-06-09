import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAllFonti, getAllCampagne, getUniqueSourcesFromLeads, syncSourcesToDatabase } from "@/services/databaseService";
import { useIsMobile } from "@/hooks/use-mobile";

interface Salesperson {
  id: string;
  nome: string;
  cognome: string;
}

interface Fonte {
  id: string;
  nome: string;
  descrizione?: string;
}

interface Campagna {
  id: string;
  nome: string;
  descrizione?: string;
}

const LeadAssignmentWithExclusions = () => {
  const [numLead, setNumLead] = useState("");
  const [venditore, setVenditore] = useState("");
  const [campagna, setCampagna] = useState("");
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [fonti, setFonti] = useState<Fonte[]>([]);
  const [campagne, setCampagne] = useState<Campagna[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [excludedSources, setExcludedSources] = useState<string[]>([]);
  const [availableLeads, setAvailableLeads] = useState(0);
  const [uniqueSources, setUniqueSources] = useState<string[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchSalespeople();
    fetchFonti();
    fetchCampagne();
    fetchUniqueSources();
    updateAvailableLeads();
  }, [excludedSources]);

  const fetchSalespeople = async () => {
    try {
      const { data, error } = await supabase
        .from('venditori')
        .select('id, nome, cognome')
        .eq('stato', 'attivo');
      
      if (error) throw error;
      setSalespeople(data || []);
    } catch (error) {
      console.error("Error fetching salespeople:", error);
    }
  };

  const fetchFonti = async () => {
    try {
      await syncSourcesToDatabase();
      const data = await getAllFonti();
      setFonti(data);
    } catch (error) {
      console.error("Error fetching fonti:", error);
    }
  };

  const fetchUniqueSources = async () => {
    try {
      const sources = await getUniqueSourcesFromLeads();
      setUniqueSources(sources);
    } catch (error) {
      console.error("Error fetching unique sources:", error);
    }
  };

  const fetchCampagne = async () => {
    try {
      const data = await getAllCampagne();
      setCampagne(data);
    } catch (error) {
      console.error("Error fetching campagne:", error);
    }
  };

  const updateAvailableLeads = async () => {
    try {
      let query = supabase
        .from('lead_generation')
        .select('id, fonte', { count: 'exact' })
        .eq('assignable', true)
        .is('venditore', null);

      if (excludedSources.length > 0) {
        excludedSources.forEach(source => {
          query = query.not('fonte', 'like', `%${source}%`);
        });
      }

      const { count, error } = await query;
      
      if (error) throw error;
      
      console.log(`Lead disponibili per assegnazione: ${count}`);
      setAvailableLeads(count || 0);
    } catch (error) {
      console.error("Error fetching available leads:", error);
    }
  };

  const addExcludedSource = (sourceName: string) => {
    if (sourceName && !excludedSources.includes(sourceName)) {
      setExcludedSources([...excludedSources, sourceName]);
    }
  };

  const removeExcludedSource = (source: string) => {
    setExcludedSources(excludedSources.filter(s => s !== source));
  };

  const handleAssign = async () => {
    const numLeadValue = parseInt(numLead);
    if (!venditore || !numLead || numLeadValue <= 0) {
      toast.error("Inserisci tutti i campi obbligatori");
      return;
    }

    if (numLeadValue > availableLeads) {
      toast.error(`Solo ${availableLeads} lead disponibili per l'assegnazione`);
      return;
    }

    setIsSubmitting(true);
    try {
      await assignLeadsWithExclusions({
        numLead: numLeadValue,
        venditore,
        campagna,
        excludedSources
      });
      
      toast.success(`${numLeadValue} lead assegnati con successo a ${venditore}`);
      
      // Reset form
      setNumLead("");
      setVenditore("");
      setCampagna("");
      
      // Refresh data
      fetchCampagne();
      updateAvailableLeads();
    } catch (error) {
      console.error("Error assigning leads:", error);
      toast.error("Errore nell'assegnazione dei lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  const assignLeadsWithExclusions = async (data: {
    numLead: number;
    venditore: string;
    campagna?: string;
    excludedSources: string[];
  }) => {
    try {
      // Get global webhook URL from system settings
      const { data: webhookData, error: webhookError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'lead_assign_webhook_url')
        .single();
      
      if (webhookError || !webhookData?.value) {
        throw new Error('Webhook URL non configurato nelle impostazioni');
      }

      const webhookUrl = webhookData.value;

      // Get venditore details INCLUDING Google Sheets info
      const { data: venditorData, error: venditorError } = await supabase
        .from('venditori')
        .select('*')
        .eq('nome', data.venditore)
        .single();
      
      if (venditorError || !venditorData) {
        throw new Error('Venditore non trovato');
      }

      // Costruisci la query per ottenere i lead assegnabili
      let query = supabase
        .from('lead_generation')
        .select('*')
        .eq('assignable', true)
        .is('venditore', null)
        .order('created_at', { ascending: true })
        .limit(data.numLead);

      if (data.excludedSources.length > 0) {
        data.excludedSources.forEach(source => {
          query = query.not('fonte', 'like', `%${source}%`);
        });
      }

      const { data: leadsToAssign, error: fetchError } = await query;
      
      if (fetchError || !leadsToAssign || leadsToAssign.length < data.numLead) {
        throw new Error(`Solo ${leadsToAssign?.length || 0} lead disponibili per l'assegnazione.`);
      }
      
      console.log(`Assegnando ${leadsToAssign.length} lead a ${data.venditore}:`, leadsToAssign);
      
      // Aggiorna i lead per assegnarli
      const leadIds = leadsToAssign.map(lead => lead.id);
      
      const updateObj: Record<string, any> = { venditore: data.venditore };
      if (data.campagna) updateObj.campagna = data.campagna;
      
      const { error: updateError } = await supabase
        .from('lead_generation')
        .update(updateObj)
        .in('id', leadIds);
      
      if (updateError) {
        throw new Error("Errore nell'assegnazione dei lead");
      }

      // Salva la nuova campagna se non esiste
      if (data.campagna && data.campagna.trim()) {
        try {
          await supabase
            .from('database_campagne')
            .insert([{ nome: data.campagna.trim() }])
            .select()
            .single();
        } catch (error) {
          console.log('Campagna già esistente');
        }
      }

      // Registra nell'assignment_history
      const { error: historyError } = await supabase
        .from('assignment_history')
        .insert({
          leads_count: leadsToAssign.length,
          venditore: data.venditore,
          campagna: data.campagna || null,
          fonti_escluse: data.excludedSources.length > 0 ? data.excludedSources : null
        });

      if (historyError) {
        console.error("Error recording assignment history:", historyError);
      }

      // Invia tramite webhook globale con TUTTI i dati richiesti inclusi Google Sheets
      if (leadsToAssign.length > 0) {
        try {
          const assignmentData = {
            venditore: data.venditore,
            venditore_cognome: venditorData.cognome || '',
            venditore_email: venditorData.email || '',
            venditore_telefono: venditorData.telefono || '',
            google_sheets_file_id: venditorData.sheets_file_id,
            google_sheets_tab_name: venditorData.sheets_tab_name,
            campagna: data.campagna || '',
            leads: leadsToAssign.map(lead => ({
              id: lead.id,
              nome: lead.nome,
              cognome: lead.cognome || '',
              email: lead.email || '',
              telefono: lead.telefono || '',
              fonte: lead.fonte || '',
              note: lead.note || '',
              created_at: lead.created_at,
              assigned_at: new Date().toISOString()
            })),
            timestamp: new Date().toISOString(),
            leads_count: leadsToAssign.length
          };

          console.log('Invio dati tramite webhook globale con Google Sheets info:', assignmentData);
          console.log('Webhook URL:', webhookUrl);

          const response = await supabase.functions.invoke('lead-assign-webhook', {
            body: { 
              assignmentData,
              webhookUrl
            }
          });
          
          if (response.error) {
            console.error("Error sending to webhook:", response.error);
            toast.warning("Lead assegnati ma errore nell'invio al webhook");
          } else {
            console.log("Successfully sent to webhook:", response.data);
            toast.success("Lead assegnati e inviati tramite webhook");
          }
        } catch (error) {
          console.error("Error in webhook delivery:", error);
          toast.warning("Lead assegnati ma errore nel sistema di delivery");
        }
      }
      
      return leadsToAssign;
    } catch (error) {
      console.error("Error assigning leads:", error);
      throw error;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Assegnazione Lead</CardTitle>
        <CardDescription className="text-sm">
          Assegna lead ai venditori escludendo fonti specifiche. Lead disponibili: {availableLeads}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="numLead" className="text-sm font-medium">Numero di Lead</Label>
            <Input
              id="numLead"
              type="number"
              min="1"
              max={availableLeads}
              value={numLead}
              onChange={(e) => setNumLead(e.target.value)}
              placeholder="Inserisci numero"
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="venditore" className="text-sm font-medium">Venditore</Label>
            <Select value={venditore} onValueChange={setVenditore}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona venditore" />
              </SelectTrigger>
              <SelectContent 
                className={isMobile ? "max-h-[200px]" : ""}
                position={isMobile ? "popper" : "item-aligned"}
                sideOffset={isMobile ? 5 : undefined}
              >
                {salespeople.map((person) => (
                  <SelectItem key={person.id} value={person.nome}>
                    <span className="truncate">{person.nome} {person.cognome}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="campagna" className="text-sm font-medium">Campagna</Label>
          <Select value={campagna} onValueChange={setCampagna}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleziona o digita una nuova campagna" />
            </SelectTrigger>
            <SelectContent 
              className={isMobile ? "max-h-[200px]" : ""}
              position={isMobile ? "popper" : "item-aligned"}
              sideOffset={isMobile ? 5 : undefined}
            >
              {campagne.map((camp) => (
                <SelectItem key={camp.id} value={camp.nome}>
                  <span className="truncate">{camp.nome}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-full mt-2"
            value={campagna}
            onChange={(e) => setCampagna(e.target.value)}
            placeholder="O digita una nuova campagna"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Escludi Fonti</Label>
          <Select onValueChange={addExcludedSource}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleziona fonte da escludere" />
            </SelectTrigger>
            <SelectContent 
              className={isMobile ? "max-h-[200px]" : ""}
              position={isMobile ? "popper" : "item-aligned"}
              sideOffset={isMobile ? 5 : undefined}
            >
              {uniqueSources
                .filter(source => !excludedSources.includes(source))
                .map((source) => (
                <SelectItem key={source} value={source}>
                  <span className="truncate">{source}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {excludedSources.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {excludedSources.map((source) => (
                <Badge key={source} variant="secondary" className="flex items-center gap-1 text-xs max-w-full">
                  <span className="truncate">{source}</span>
                  <button
                    onClick={() => removeExcludedSource(source)}
                    className="ml-1 hover:text-destructive flex-shrink-0"
                    aria-label={`Rimuovi ${source}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Button 
          onClick={handleAssign} 
          disabled={isSubmitting || !venditore || !numLead || parseInt(numLead) <= 0 || parseInt(numLead) > availableLeads}
          className="w-full mt-6 text-sm sm:text-base py-2 sm:py-3"
        >
          {isSubmitting ? "Assegnazione in corso..." : "Assegna Lead"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default LeadAssignmentWithExclusions;
