import { useState, useEffect, useCallback } from "react";
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
  const [excludeFromIncluded, setExcludeFromIncluded] = useState<string[]>([]);
  const [sourceMode, setSourceMode] = useState<'exclude' | 'include'>('exclude');
  const [availableLeads, setAvailableLeads] = useState(0);
  const [uniqueSources, setUniqueSources] = useState<string[]>([]);
  const [bypassTimeInterval, setBypassTimeInterval] = useState(false);
  const [isUpdatingCount, setIsUpdatingCount] = useState(false);

  // Memoized function for updating available leads
  const updateAvailableLeads = useCallback(async () => {
    setIsUpdatingCount(true);
    try {
      console.log(`🔄 Updating available leads count...`);
      const count = await getAvailableLeadsCount(
        excludedSources, 
        includedSources, 
        sourceMode, 
        bypassTimeInterval,
        excludeFromIncluded
      );
      console.log(`✅ Lead disponibili: ${count} (modalità ${sourceMode}, bypass: ${bypassTimeInterval})`);
      setAvailableLeads(count);
      return count;
    } catch (error) {
      console.error("❌ Error fetching available leads:", error);
      setAvailableLeads(0);
      return 0;
    } finally {
      setIsUpdatingCount(false);
    }
  }, [excludedSources, includedSources, sourceMode, bypassTimeInterval, excludeFromIncluded]);

  useEffect(() => {
    initializeData();
  }, []);

  // Immediate update when any filter changes
  useEffect(() => {
    console.log(`🔄 Filter changed, updating count immediately...`);
    updateAvailableLeads();
  }, [updateAvailableLeads]);

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

  const addExcludedSource = (sourceName: string) => {
    if (sourceName && !excludedSources.includes(sourceName)) {
      console.log(`➕ Adding excluded source: ${sourceName}`);
      setExcludedSources(prev => [...prev, sourceName]);
    }
  };

  const removeExcludedSource = (source: string) => {
    console.log(`➖ Removing excluded source: ${source}`);
    setExcludedSources(prev => prev.filter(s => s !== source));
  };

  const addIncludedSource = (sourceName: string) => {
    if (sourceName && !includedSources.includes(sourceName)) {
      console.log(`➕ Adding included source: ${sourceName}`);
      setIncludedSources(prev => [...prev, sourceName]);
    }
  };

  const removeIncludedSource = (source: string) => {
    console.log(`➖ Removing included source: ${source}`);
    setIncludedSources(prev => prev.filter(s => s !== source));
  };

  const addExcludeFromIncluded = (sourceName: string) => {
    if (sourceName && !excludeFromIncluded.includes(sourceName)) {
      console.log(`➕ Adding exclude from included: ${sourceName}`);
      setExcludeFromIncluded(prev => [...prev, sourceName]);
    }
  };

  const removeExcludeFromIncluded = (source: string) => {
    console.log(`➖ Removing exclude from included: ${source}`);
    setExcludeFromIncluded(prev => prev.filter(s => s !== source));
  };

  const toggleSourceMode = (newMode: 'exclude' | 'include') => {
    console.log(`🔄 Switching source mode to: ${newMode}`);
    setSourceMode(newMode);
    setExcludedSources([]);
    setIncludedSources([]);
    setExcludeFromIncluded([]);
  };

  const toggleBypassTimeInterval = () => {
    const newBypass = !bypassTimeInterval;
    console.log(`🔄 Toggling bypass time interval to: ${newBypass}`);
    setBypassTimeInterval(newBypass);
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
        excludeFromIncluded
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
    excludeFromIncluded,
    sourceMode,
    availableLeads,
    uniqueSources,
    bypassTimeInterval,
    isUpdatingCount,
    addExcludedSource,
    removeExcludedSource,
    addIncludedSource,
    removeIncludedSource,
    addExcludeFromIncluded,
    removeExcludeFromIncluded,
    toggleSourceMode,
    toggleBypassTimeInterval,
    handleAssign,
    updateAvailableLeads
  };
}
