
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
  const [numLead, setNumLead] = useState(1);
  const [venditore, setVenditore] = useState("");
  const [campagna, setCampagna] = useState("");
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [fonti, setFonti] = useState<Fonte[]>([]);
  const [campagne, setCampagne] = useState<Campagna[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [excludedSources, setExcludedSources] = useState<string[]>([]);
  const [availableLeads, setAvailableLeads] = useState(0);
  const [uniqueSources, setUniqueSources] = useState<string[]>([]);

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
      // First sync sources from leads to database
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
    if (!venditore || numLead <= 0) {
      toast.error("Inserisci tutti i campi obbligatori");
      return;
    }

    if (numLead > availableLeads) {
      toast.error(`Solo ${availableLeads} lead disponibili per l'assegnazione`);
      return;
    }

    setIsSubmitting(true);
    try {
      await assignLeadsWithExclusions({
        numLead,
        venditore,
        campagna,
        excludedSources
      });
      
      toast.success(`${numLead} lead assegnati con successo a ${venditore}`);
      
      // Reset form
      setNumLead(1);
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

  // Funzione per gestire l'assegnazione con esclusioni
  const assignLeadsWithExclusions = async (data: {
    numLead: number;
    venditore: string;
    campagna?: string;
    excludedSources: string[];
  }) => {
    try {
      // Get venditore delivery settings with all required fields
      const { data: venditorData, error: venditorError } = await supabase
        .from('venditori')
        .select('*')
        .eq('nome', data.venditore)
        .single();
      
      if (venditorError || !venditorData) {
        throw new Error('Venditore non trovato o non configurato');
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

      // Invia ai sistemi esterni basandosi sulla configurazione del venditore
      if (leadsToAssign.length > 0) {
        try {
          const assignmentData = {
            venditore: {
              nome: data.venditore,
              delivery_method: venditorData.delivery_method
            },
            leads: leadsToAssign.map(lead => ({
              nome: lead.nome,
              cognome: lead.cognome || '',
              email: lead.email || '',
              telefono: lead.telefono || '',
              created_at: lead.created_at,
              id: lead.id
            })),
            timestamp: new Date().toISOString(),
            campagna: data.campagna || ''
          };

          if (venditorData.delivery_method === 'sheets' && venditorData.sheets_file_id && venditorData.sheets_tab_name) {
            // Usa Google Sheets
            const response = await supabase.functions.invoke('google-sheets-delivery', {
              body: { 
                assignmentData,
                sheetsConfig: {
                  fileId: venditorData.sheets_file_id,
                  tabName: venditorData.sheets_tab_name
                }
              }
            });
            
            if (response.error) {
              console.error("Error sending to Google Sheets:", response.error);
              toast.error("Errore nell'invio a Google Sheets, ma lead assegnati correttamente");
            } else {
              console.log("Successfully sent to Google Sheets");
            }
          } else if (venditorData.delivery_method === 'webhook' && venditorData.webhook_url) {
            // Usa webhook esterno
            const response = await supabase.functions.invoke('lead-assign-webhook', {
              body: { assignmentData, webhookUrl: venditorData.webhook_url }
            });
            
            if (response.error) {
              console.error("Error sending to webhook:", response.error);
              toast.error("Errore nell'invio al webhook, ma lead assegnati correttamente");
            } else {
              console.log("Successfully sent to webhook");
            }
          } else {
            console.warn("Venditore delivery method not properly configured");
            toast.warning("Lead assegnati ma sistema di delivery non configurato");
          }
        } catch (error) {
          console.error("Error in delivery system:", error);
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
        <CardTitle>Assegnazione Lead</CardTitle>
        <CardDescription>
          Assegna lead ai venditori escludendo fonti specifiche. Lead disponibili: {availableLeads}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="numLead">Numero di Lead</Label>
            <Input
              id="numLead"
              type="number"
              min="1"
              max={availableLeads}
              value={numLead}
              onChange={(e) => setNumLead(parseInt(e.target.value) || 1)}
            />
          </div>
          
          <div>
            <Label htmlFor="venditore">Venditore</Label>
            <Select value={venditore} onValueChange={setVenditore}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona venditore" />
              </SelectTrigger>
              <SelectContent>
                {salespeople.map((person) => (
                  <SelectItem key={person.id} value={person.nome}>
                    {person.nome} {person.cognome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="campagna">Campagna</Label>
          <Select value={campagna} onValueChange={setCampagna}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona o digita una nuova campagna" />
            </SelectTrigger>
            <SelectContent>
              {campagne.map((camp) => (
                <SelectItem key={camp.id} value={camp.nome}>
                  {camp.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="mt-2"
            value={campagna}
            onChange={(e) => setCampagna(e.target.value)}
            placeholder="O digita una nuova campagna"
          />
        </div>

        <div>
          <Label>Escludi Fonti</Label>
          <Select onValueChange={addExcludedSource}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Seleziona fonte da escludere" />
            </SelectTrigger>
            <SelectContent>
              {uniqueSources
                .filter(source => !excludedSources.includes(source))
                .map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {excludedSources.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {excludedSources.map((source) => (
                <Badge key={source} variant="secondary" className="flex items-center gap-1">
                  {source}
                  <button
                    onClick={() => removeExcludedSource(source)}
                    className="ml-1 hover:text-destructive"
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
          disabled={isSubmitting || !venditore || numLead <= 0 || numLead > availableLeads}
          className="w-full"
        >
          {isSubmitting ? "Assegnazione in corso..." : "Assegna Lead"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default LeadAssignmentWithExclusions;
