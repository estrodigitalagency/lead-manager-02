import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAllFonti, getAllCampagne, getUniqueSourcesFromLeads, syncSourcesToDatabase } from "@/services/databaseService";
import { assignLeadsWithExclusions, LeadAssignmentData, getAvailableLeadsCount } from "@/services/leadAssignmentService";

export function useLeadAssignment() {
  const [numLead, setNumLead] = useState("");
  const [venditore, setVenditore] = useState("");
  const [campagna, setCampagna] = useState("");
  const [salespeople, setSalespeople] = useState<{id: string; nome: string; cognome: string;}[]>([]);
  const [fonti, setFonti] = useState<{id: string; nome: string; descrizione?: string;}[]>([]);
  const [campagne, setCampagne] = useState<{id: string; nome: string; descrizione?: string;}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [excludedSources, setExcludedSources] = useState<string[]>([]);
  const [includedSources, setIncludedSources] = useState<string[]>([]);
  const [excludeFromIncluded, setExcludeFromIncluded] = useState<string[]>([]); // Nuova proprietà
  const [sourceMode, setSourceMode] = useState<'exclude' | 'include'>('exclude');
  const [availableLeads, setAvailableLeads] = useState(0);
  const [uniqueSources, setUniqueSources] = useState<string[]>([]);
  const [bypassTimeInterval, setBypassTimeInterval] = useState(false);

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    updateAvailableLeads();
  }, [excludedSources, includedSources, excludeFromIncluded, sourceMode, bypassTimeInterval]);

  const initializeData = async () => {
    try {
      // Carica tutti i dati in parallelo senza verifica assegnabilità
      await Promise.all([
        fetchSalespeople(),
        fetchFonti(),
        fetchCampagne(),
        fetchUniqueSources()
      ]);
      
    } catch (error) {
      console.error("Errore nell'inizializzazione:", error);
      toast.error("Errore nel caricamento iniziale");
    }
  };

  const fetchSalespeople = async () => {
    try {
      const { data, error } = await supabase
        .from('venditori')
        .select('id, nome, cognome')
        .eq('stato', 'attivo')
        .order('nome');
      
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
      const count = await getAvailableLeadsCount(
        excludedSources, 
        includedSources, 
        sourceMode, 
        bypassTimeInterval,
        excludeFromIncluded // Passa la nuova proprietà
      );
      console.log(`Lead disponibili per assegnazione (modalità ${sourceMode}, bypass: ${bypassTimeInterval}, esclusi da inclusi: ${excludeFromIncluded.length}): ${count}`);
      setAvailableLeads(count);
    } catch (error) {
      console.error("Error fetching available leads:", error);
      setAvailableLeads(0);
    }
  };

  const addExcludedSource = async (sourceName: string) => {
    if (sourceName && !excludedSources.includes(sourceName)) {
      const newExcludedSources = [...excludedSources, sourceName];
      setExcludedSources(newExcludedSources);
      
      try {
        const count = await getAvailableLeadsCount(newExcludedSources, includedSources, sourceMode, bypassTimeInterval);
        console.log(`Lead disponibili dopo esclusione di ${sourceName}: ${count}`);
        setAvailableLeads(count);
      } catch (error) {
        console.error("Error updating available leads after exclusion:", error);
      }
    }
  };

  const removeExcludedSource = async (source: string) => {
    const newExcludedSources = excludedSources.filter(s => s !== source);
    setExcludedSources(newExcludedSources);
    
    try {
      const count = await getAvailableLeadsCount(newExcludedSources, includedSources, sourceMode, bypassTimeInterval);
      console.log(`Lead disponibili dopo rimozione esclusione di ${source}: ${count}`);
      setAvailableLeads(count);
    } catch (error) {
      console.error("Error updating available leads after removing exclusion:", error);
    }
  };

  const addIncludedSource = async (sourceName: string) => {
    if (sourceName && !includedSources.includes(sourceName)) {
      const newIncludedSources = [...includedSources, sourceName];
      setIncludedSources(newIncludedSources);
      
      try {
        const count = await getAvailableLeadsCount(excludedSources, newIncludedSources, sourceMode, bypassTimeInterval);
        console.log(`Lead disponibili dopo inclusione di ${sourceName}: ${count}`);
        setAvailableLeads(count);
      } catch (error) {
        console.error("Error updating available leads after inclusion:", error);
      }
    }
  };

  const removeIncludedSource = async (source: string) => {
    const newIncludedSources = includedSources.filter(s => s !== source);
    setIncludedSources(newIncludedSources);
    
    try {
      const count = await getAvailableLeadsCount(excludedSources, newIncludedSources, sourceMode, bypassTimeInterval);
      console.log(`Lead disponibili dopo rimozione inclusione di ${source}: ${count}`);
      setAvailableLeads(count);
    } catch (error) {
      console.error("Error updating available leads after removing inclusion:", error);
    }
  };

  const addExcludeFromIncluded = async (sourceName: string) => {
    if (sourceName && !excludeFromIncluded.includes(sourceName)) {
      const newExcludeFromIncluded = [...excludeFromIncluded, sourceName];
      setExcludeFromIncluded(newExcludeFromIncluded);
      
      try {
        const count = await getAvailableLeadsCount(
          excludedSources, 
          includedSources, 
          sourceMode, 
          bypassTimeInterval,
          newExcludeFromIncluded
        );
        console.log(`Lead disponibili dopo esclusione "${sourceName}" da fonti incluse: ${count}`);
        setAvailableLeads(count);
      } catch (error) {
        console.error("Error updating available leads after exclusion from included:", error);
      }
    }
  };

  const removeExcludeFromIncluded = async (source: string) => {
    const newExcludeFromIncluded = excludeFromIncluded.filter(s => s !== source);
    setExcludeFromIncluded(newExcludeFromIncluded);
    
    try {
      const count = await getAvailableLeadsCount(
        excludedSources, 
        includedSources, 
        sourceMode, 
        bypassTimeInterval,
        newExcludeFromIncluded
      );
      console.log(`Lead disponibili dopo rimozione esclusione "${source}" da fonti incluse: ${count}`);
      setAvailableLeads(count);
    } catch (error) {
      console.error("Error updating available leads after removing exclusion from included:", error);
    }
  };

  const toggleSourceMode = async (newMode: 'exclude' | 'include') => {
    setSourceMode(newMode);
    setExcludedSources([]);
    setIncludedSources([]);
    setExcludeFromIncluded([]); // Reset anche le esclusioni dalle incluse
    
    try {
      const count = await getAvailableLeadsCount([], [], newMode, bypassTimeInterval, []);
      console.log(`Lead disponibili dopo cambio modalità a ${newMode}: ${count}`);
      setAvailableLeads(count);
    } catch (error) {
      console.error("Error updating available leads after mode change:", error);
    }
  };

  const toggleBypassTimeInterval = () => {
    setBypassTimeInterval(!bypassTimeInterval);
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
      console.log(`Tentativo di assegnazione di ${numLeadInt} lead a ${venditore} (bypass: ${bypassTimeInterval}, esclusi da inclusi: ${excludeFromIncluded.length})`);
      
      await assignLeadsWithExclusions({
        numLead: numLeadInt,
        venditore,
        campagna,
        excludedSources,
        includedSources,
        sourceMode,
        bypassTimeInterval,
        excludeFromIncluded // Passa la nuova proprietà
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

  return {
    numLead,
    setNumLead,
    venditore,
    setVenditore,
    campagna,
    setCampagna,
    salespeople,
    fonti,
    campagne,
    isSubmitting,
    excludedSources,
    includedSources,
    excludeFromIncluded, // Nuova proprietà
    sourceMode,
    availableLeads,
    uniqueSources,
    bypassTimeInterval,
    addExcludedSource,
    removeExcludedSource,
    addIncludedSource,
    removeIncludedSource,
    addExcludeFromIncluded, // Nuove funzioni
    removeExcludeFromIncluded,
    toggleSourceMode,
    toggleBypassTimeInterval,
    handleAssign,
    updateAvailableLeads
  };
}
