import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAllFonti, getAllCampagne, getUniqueSourcesFromLeads, syncSourcesToDatabase } from "@/services/databaseService";
import { assignLeadsWithExclusions, LeadAssignmentData } from "@/services/leadAssignmentService";
import { useRealTimeLeadCount } from "./useRealTimeLeadCount";

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
  const [uniqueSources, setUniqueSources] = useState<string[]>([]);
  const [bypassTimeInterval, setBypassTimeInterval] = useState(false);
  const [onlyHotLeads, setOnlyHotLeads] = useState(false);

  // Usa il nuovo hook per il conteggio in tempo reale con tutti i parametri
  const { 
    count: availableLeads, 
    isLoading: isUpdatingCount, 
    refreshCount: updateAvailableLeads 
  } = useRealTimeLeadCount({
    excludedSources,
    includedSources,
    sourceMode,
    bypassTimeInterval,
    excludeFromIncluded,
    onlyHotLeads
  });

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      console.log('🚀 Initializing lead assignment data...');
      
      // Carica tutti i dati in parallelo
      await Promise.all([
        fetchSalespeople(),
        fetchFonti(),
        fetchCampagne(),
        fetchUniqueSources()
      ]);
      
      console.log('✅ Lead assignment data initialized');
    } catch (error) {
      console.error("❌ Error in initialization:", error);
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
      console.log(`📊 Loaded ${data?.length || 0} active salespeople`);
    } catch (error) {
      console.error("Error fetching salespeople:", error);
    }
  };

  const fetchFonti = async () => {
    try {
      await syncSourcesToDatabase();
      const data = await getAllFonti();
      setFonti(data);
      console.log(`📊 Loaded ${data.length} fonti`);
    } catch (error) {
      console.error("Error fetching fonti:", error);
    }
  };

  const fetchUniqueSources = async () => {
    try {
      const sources = await getUniqueSourcesFromLeads();
      setUniqueSources(sources);
      console.log(`📊 Loaded ${sources.length} unique sources from leads`);
    } catch (error) {
      console.error("Error fetching unique sources:", error);
    }
  };

  const fetchCampagne = async () => {
    try {
      const data = await getAllCampagne();
      setCampagne(data);
      console.log(`📊 Loaded ${data.length} campagne`);
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
    console.log(`🔄 Switching source mode from ${sourceMode} to ${newMode}`);
    setSourceMode(newMode);
    setExcludedSources([]);
    setIncludedSources([]);
    setExcludeFromIncluded([]);
  };

  const toggleBypassTimeInterval = () => {
    const newBypass = !bypassTimeInterval;
    console.log(`🔄 Toggling bypass time interval from ${bypassTimeInterval} to ${newBypass}`);
    setBypassTimeInterval(newBypass);
  };

  const toggleOnlyHotLeads = () => {
    const newOnlyHot = !onlyHotLeads;
    console.log(`🔄 Toggling only hot leads from ${onlyHotLeads} to ${newOnlyHot}`);
    setOnlyHotLeads(newOnlyHot);
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
      console.log(`🎯 Starting assignment: ${numLeadInt} leads to ${venditore}`);
      console.log(`📋 Assignment parameters:`, {
        sourceMode,
        excludedSources: excludedSources.length,
        includedSources: includedSources.length,
        excludeFromIncluded: excludeFromIncluded.length,
        bypassTimeInterval
      });
      
      await assignLeadsWithExclusions({
        numLead: numLeadInt,
        venditore,
      campagna,
      excludedSources,
      includedSources,
      sourceMode,
      bypassTimeInterval,
      excludeFromIncluded,
      onlyHotLeads
      });
      
      toast.success(`${numLeadInt} lead assegnati con successo a ${venditore}`);
      
      // Reset form
      setNumLead("");
      setVenditore("");
      setCampagna("");
      
      // Refresh data
      fetchCampagne();
      updateAvailableLeads();
      
      console.log(`✅ Assignment completed successfully`);
    } catch (error) {
      console.error("❌ Error assigning leads:", error);
      const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
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
    onlyHotLeads,
    isUpdatingCount,
    addExcludedSource,
    removeExcludedSource,
    addIncludedSource,
    removeIncludedSource,
    addExcludeFromIncluded,
    removeExcludeFromIncluded,
    toggleSourceMode,
    toggleBypassTimeInterval,
    toggleOnlyHotLeads,
    handleAssign,
    updateAvailableLeads
  };
}
