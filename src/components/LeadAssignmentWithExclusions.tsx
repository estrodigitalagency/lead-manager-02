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
        .is('venditore', null)
        .neq('booked_call', 'SI'); // Escludi lead con call prenotate

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
    const numLeadInt = parseInt(numLead) || 0;
    if (!venditore || numLeadInt <= 0) {
      toast.error("Inserisci tutti i campi obbligatori");
      return;
    }

    if (numLeadInt > availableLeads) {
      toast.error(`Solo ${availableLeads} lead disponibili per l'assegnazione`);
      return;
    }

    setIsSubmitting(true);
    try {
      console.log(`Tentativo di assegnazione di ${numLeadInt} lead a ${venditore}`);
      
      await assignLeadsWithExclusions({
        numLead: numLeadInt,
        venditore,
        campagna,
        excludedSources
      });
      
      toast.success(`${numLeadInt} lead assegnati con successo a ${venditore}`);
      
      // Reset form
      setNumLead("");
      setVenditore("");
      setCampagna("");
      
      // Refresh data
      fetchCampagne();
      updateAvailableLeads();
    } catch (error) {
      console.error("Error assigning leads:", error);
      const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
      console.error("Dettaglio errore:", errorMessage);
      toast.error(`Errore nell'assegnazione dei lead: ${errorMessage}`);
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
      console.log("Inizio processo di assegnazione con dati:", data);
      
      // Get global webhook URL from system settings
      const { data: webhookData, error: webhookError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'lead_assign_webhook_url')
        .single();
      
      console.log("Webhook data retrieved:", webhookData);
      
      if (webhookError) {
        console.error('Errore nel recupero webhook URL:', webhookError);
        throw new Error(`Errore webhook: ${webhookError.message}`);
      }
      
      if (!webhookData?.value) {
        throw new Error('Webhook URL non configurato nelle impostazioni');
      }

      const webhookUrl = webhookData.value;
      console.log("Using webhook URL:", webhookUrl);

      // Get venditore details INCLUDING Google Sheets info
      // Fix: search by concatenated name and surname
      const { data: venditorData, error: venditorError } = await supabase
        .from('venditori')
        .select('*')
        .eq('stato', 'attivo')
        .ilike('nome', `%${data.venditore.split(' ')[0]}%`)
        .ilike('cognome', `%${data.venditore.split(' ')[1] || ''}%`);
      
      console.log("Venditore data retrieved:", venditorData);
      
      if (venditorError) {
        console.error('Errore nel recupero dati venditore:', venditorError);
        throw new Error(`Errore venditore: ${venditorError.message}`);
      }
      
      if (!venditorData || venditorData.length === 0) {
        throw new Error(`Venditore "${data.venditore}" non trovato nella tabella venditori`);
      }

      // If multiple results, try to find exact match
      let selectedVenditore = venditorData[0];
      if (venditorData.length > 1) {
        const exactMatch = venditorData.find(v => 
          `${v.nome} ${v.cognome}`.toLowerCase() === data.venditore.toLowerCase()
        );
        if (exactMatch) {
          selectedVenditore = exactMatch;
        }
      }

      console.log("Selected venditore:", selectedVenditore);

      // Costruisci la query per ottenere i lead assegnabili - ORDINA PER DATA CREAZIONE (PIÙ VECCHI PRIMA)
      console.log("Costruzione query per lead assegnabili (ordinati cronologicamente)...");
      let query = supabase
        .from('lead_generation')
        .select('*')
        .eq('assignable', true)
        .is('venditore', null)
        .neq('booked_call', 'SI') // Escludi lead con call prenotate
        .order('created_at', { ascending: true }) // CAMBIATO: I più vecchi prima
        .limit(data.numLead);

      if (data.excludedSources.length > 0) {
        console.log("Applicando esclusioni per fonti:", data.excludedSources);
        data.excludedSources.forEach(source => {
          query = query.not('fonte', 'like', `%${source}%`);
        });
      }

      const { data: leadsToAssign, error: fetchError } = await query;
      
      console.log("Lead recuperati per assegnazione (ordinati cronologicamente):", leadsToAssign?.length || 0);
      if (leadsToAssign && leadsToAssign.length > 0) {
        console.log("Primo lead (più vecchio):", {
          id: leadsToAssign[0].id,
          email: leadsToAssign[0].email,
          created_at: leadsToAssign[0].created_at
        });
        console.log("Ultimo lead (più recente):", {
          id: leadsToAssign[leadsToAssign.length - 1].id,
          email: leadsToAssign[leadsToAssign.length - 1].email,
          created_at: leadsToAssign[leadsToAssign.length - 1].created_at
        });
      }
      
      if (fetchError) {
        console.error('Errore nel recupero lead:', fetchError);
        throw new Error(`Errore recupero lead: ${fetchError.message}`);
      }
      
      if (!leadsToAssign || leadsToAssign.length < data.numLead) {
        const availableCount = leadsToAssign?.length || 0;
        throw new Error(`Solo ${availableCount} lead disponibili per l'assegnazione (richiesti: ${data.numLead}).`);
      }
      
      console.log(`Assegnando ${leadsToAssign.length} lead a ${data.venditore} (ordinati cronologicamente):`, 
        leadsToAssign.map(l => ({ id: l.id, email: l.email, created_at: l.created_at })));
      
      // Aggiorna i lead per assegnarli
      const leadIds = leadsToAssign.map(lead => lead.id);
      
      const updateObj: Record<string, any> = { venditore: data.venditore };
      if (data.campagna) updateObj.campagna = data.campagna;
      
      console.log("Aggiornamento lead con oggetto:", updateObj);
      
      const { error: updateError } = await supabase
        .from('lead_generation')
        .update(updateObj)
        .in('id', leadIds);
      
      if (updateError) {
        console.error('Errore nell\'aggiornamento lead:', updateError);
        throw new Error(`Errore aggiornamento lead: ${updateError.message}`);
      }

      console.log("Lead aggiornati con successo (cronologicamente ordinati)");

      // Salva la nuova campagna se non esiste
      if (data.campagna && data.campagna.trim()) {
        try {
          console.log("Tentativo di salvare nuova campagna:", data.campagna);
          await supabase
            .from('database_campagne')
            .insert([{ nome: data.campagna.trim() }])
            .select()
            .single();
          console.log("Campagna salvata con successo");
        } catch (error) {
          console.log('Campagna già esistente o errore nel salvataggio:', error);
        }
      }

      // Registra nell'assignment_history
      console.log("Registrazione nell'assignment_history...");
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
      } else {
        console.log("Assignment history registrato con successo");
      }

      // Invia tramite webhook globale con TUTTI i dati richiesti inclusi Google Sheets
      if (leadsToAssign.length > 0) {
        try {
          console.log("Preparazione dati per webhook...");
          const assignmentData = {
            venditore: data.venditore,
            venditore_cognome: selectedVenditore.cognome || '',
            venditore_email: selectedVenditore.email || '',
            venditore_telefono: selectedVenditore.telefono || '',
            google_sheets_file_id: selectedVenditore.sheets_file_id,
            google_sheets_tab_name: selectedVenditore.sheets_tab_name,
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

          console.log('Invio dati tramite webhook globale:', assignmentData);

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
              <SelectContent className={`${isMobile ? 'max-h-[200px]' : ''} bg-background border border-border`} position="popper">
                {salespeople.map((person) => {
                  const fullName = `${person.nome} ${person.cognome}`;
                  return (
                    <SelectItem 
                      key={person.id} 
                      value={fullName}
                      className="hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="truncate">{fullName}</span>
                    </SelectItem>
                  );
                })}
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
            <SelectContent className={`${isMobile ? 'max-h-[200px]' : ''} bg-background border border-border`} position="popper">
              {campagne.map((camp) => (
                <SelectItem 
                  key={camp.id} 
                  value={camp.nome}
                  className="hover:bg-accent hover:text-accent-foreground"
                >
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
            <SelectContent className={`${isMobile ? 'max-h-[200px]' : ''} bg-background border border-border`} position="popper">
              {uniqueSources
                .filter(source => !excludedSources.includes(source))
                .map((source) => (
                <SelectItem 
                  key={source} 
                  value={source}
                  className="hover:bg-accent hover:text-accent-foreground"
                >
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
