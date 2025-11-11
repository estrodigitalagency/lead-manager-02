import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAllFonti, getAllCampagne, getUniqueSourcesFromLeads, syncSourcesToDatabase } from "@/services/databaseService";
import { assignLeadsWithExclusions, LeadAssignmentData } from "@/services/leadAssignmentService";
import { Campaign } from '@/hooks/useCampaignsData';
import { useRealTimeLeadCount } from "./useRealTimeLeadCount";
import { useMarket } from "@/contexts/MarketContext";

export function useLeadAssignment() {
  const { selectedMarket } = useMarket();
  const [numLead, setNumLead] = useState("");
  const [venditore, setVenditore] = useState("");
  const [campagna, setCampagna] = useState("");
  const [salespeople, setSalespeople] = useState<{id: string; nome: string; cognome: string;}[]>([]);
  const [fonti, setFonti] = useState<{id: string; nome: string; descrizione?: string;}[]>([]);
  const [campagne, setCampagne] = useState<Campaign[]>([]);
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

  // Reload data when market changes
  useEffect(() => {
    if (selectedMarket) {
      fetchSalespeople();
      fetchCampagne();
    }
  }, [selectedMarket]);

  // Subscribe to realtime changes in lead_generation to refresh unique sources
  useEffect(() => {
    const channel = supabase
      .channel('rt-unique-sources-assignment')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_generation', filter: `market=eq.${selectedMarket}` }, () => {
        fetchUniqueSources();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMarket]);
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
        .eq('market', selectedMarket)
        .order('nome');
      
      if (error) throw error;
      setSalespeople(data || []);
      console.log(`📊 Loaded ${data?.length || 0} active salespeople for market ${selectedMarket}`);
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
    const sources = await getUniqueSourcesFromLeads(selectedMarket);
    setUniqueSources(sources);
    console.log(`📊 Loaded ${sources.length} unique sources from leads`);
  } catch (error) {
    console.error("Error fetching unique sources:", error);
  }
};

  const fetchCampagne = async () => {
    try {
      const { data, error } = await supabase
        .from('database_campagne')
        .select('*')
        .eq('market', selectedMarket)
        .order('nome', { ascending: true });

      if (error) throw error;
      const campaignsData = data?.map(campaign => ({
        ...campaign,
        source_mode: campaign.source_mode as 'exclude' | 'include' | undefined
      })) || [];
      
      setCampagne(campaignsData);
      console.log(`📊 Loaded ${campaignsData.length} campagne for market ${selectedMarket}`);
    } catch (error) {
      console.error("Error fetching campagne:", error);
    }
  };

  // Apply campaign source settings when campaign changes
  const applyCampaignSources = (selectedCampagna: string) => {
    if (!selectedCampagna) return;
    
    const campaign = campagne.find(c => c.nome === selectedCampagna);
    if (!campaign) return;

    console.log(`🎯 Applying sources from campaign: ${campaign.nome}`);
    
    // Apply source mode
    if (campaign.source_mode) {
      setSourceMode(campaign.source_mode);
    }
    
    // Apply bypass time interval
    if (campaign.bypass_time_interval !== undefined) {
      setBypassTimeInterval(campaign.bypass_time_interval);
    }
    
    // Apply source filters
    if (campaign.source_mode === 'exclude' && campaign.fonti_escluse) {
      setExcludedSources(campaign.fonti_escluse);
      setIncludedSources([]);
      setExcludeFromIncluded([]);
    } else if (campaign.source_mode === 'include' && campaign.fonti_incluse) {
      setIncludedSources(campaign.fonti_incluse);
      setExcludedSources([]);
      setExcludeFromIncluded(campaign.exclude_from_included || []);
    }
    
    console.log(`✅ Applied campaign settings:`, {
      sourceMode: campaign.source_mode,
      excludedSources: campaign.fonti_escluse,
      includedSources: campaign.fonti_incluse,
      excludeFromIncluded: campaign.exclude_from_included,
      bypassTimeInterval: campaign.bypass_time_interval
    });
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
        onlyHotLeads,
        market: selectedMarket
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
    setCampagna: (campagna: string) => {
      setCampagna(campagna);
      applyCampaignSources(campagna);
    },
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
    updateAvailableLeads,
    refreshUniqueSources: fetchUniqueSources
  };
}
