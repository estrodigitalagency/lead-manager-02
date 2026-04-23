import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAllFonti, getAllCampagne, getUniqueSourcesFromLeads } from "@/services/databaseService";
import { assignLeadsWithExclusions, checkLeadsForPreviousAssignment, LeadAssignmentData, AlreadyAssignedLeadInfo } from "@/services/leadAssignmentService";
import { Campaign } from '@/hooks/useCampaignsData';
import { useRealTimeLeadCount } from "./useRealTimeLeadCount";
import { useMarket } from "@/contexts/MarketContext";
import { GroupAssignmentDecisions } from "@/components/lead-assignment/AlreadyAssignedLeadsDialog";

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
  
  // State for already assigned leads conflict
  const [showAlreadyAssignedDialog, setShowAlreadyAssignedDialog] = useState(false);
  const [alreadyAssignedLeads, setAlreadyAssignedLeads] = useState<AlreadyAssignedLeadInfo[]>([]);
  const [pendingAssignmentData, setPendingAssignmentData] = useState<LeadAssignmentData | null>(null);

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
        .eq('attivo', true)
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

      const assignmentData: LeadAssignmentData = {
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
      };

      // Pre-check for already assigned leads
      console.log(`🔍 Checking for previously assigned leads...`);
      const preCheckResult = await checkLeadsForPreviousAssignment(assignmentData);

      if (!preCheckResult.canProceed) {
        // Show dialog with conflict
        console.log(`⚠️ Found ${preCheckResult.alreadyAssignedLeads.length} already assigned leads`);
        setAlreadyAssignedLeads(preCheckResult.alreadyAssignedLeads);
        setPendingAssignmentData(assignmentData);
        setShowAlreadyAssignedDialog(true);
        setIsSubmitting(false);
        return;
      }

      // No conflicts, proceed with assignment
      await executeAssignment(assignmentData);
      
    } catch (error) {
      console.error("❌ Error assigning leads:", error);
      const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
      toast.error(`Errore nell'assegnazione dei lead: ${errorMessage}`);
      setIsSubmitting(false);
    }
  };

  const executeAssignment = async (assignmentData: LeadAssignmentData) => {
    try {
      await assignLeadsWithExclusions(assignmentData);
      
      toast.success(`Lead assegnati con successo a ${assignmentData.venditore}`);
      
      // Reset form
      setNumLead("");
      setVenditore("");
      setCampagna("");
      
      // Refresh data
      fetchCampagne();
      updateAvailableLeads();
      
      console.log(`✅ Assignment completed successfully`);
    } catch (error) {
      console.error("❌ Error executing assignment:", error);
      const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
      toast.error(`Errore nell'assegnazione dei lead: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
      setShowAlreadyAssignedDialog(false);
      setAlreadyAssignedLeads([]);
      setPendingAssignmentData(null);
    }
  };

  const handleConfirmAssignments = async (decisions: GroupAssignmentDecisions) => {
    if (!pendingAssignmentData || alreadyAssignedLeads.length === 0) return;
    
    setIsSubmitting(true);
    console.log(`🎯 User confirmed assignment decisions:`, decisions);

    try {
      // Group leads by original salesperson
      const leadsByVenditore = alreadyAssignedLeads.reduce((acc, lead) => {
        if (!acc[lead.venditore]) {
          acc[lead.venditore] = [];
        }
        acc[lead.venditore].push(lead.id);
        return acc;
      }, {} as Record<string, string[]>);

      // Consolidate: collect ALL lead IDs going to the target venditore
      const targetLeadIds: string[] = [];
      const originalGroups: { venditore: string; leadIds: string[] }[] = [];

      // Process each group: leads going back to original venditore preserve their original campagna
      for (const [originalVenditore, leadIds] of Object.entries(leadsByVenditore)) {
        const decision = decisions[originalVenditore] || 'original';

        if (decision === 'target') {
          // These go to the target venditore - collect them for a single assignment
          targetLeadIds.push(...leadIds);
          console.log(`📤 ${leadIds.length} leads from ${originalVenditore} → target ${pendingAssignmentData.venditore}`);
        } else {
          originalGroups.push({ venditore: originalVenditore, leadIds });
        }
      }

      // Fetch campagna originale dei lead che tornano al venditore originale
      const allOriginalLeadIds = originalGroups.flatMap(g => g.leadIds);
      let leadCampagneMap = new Map<string, string | null>();
      if (allOriginalLeadIds.length > 0) {
        const { data: leadRows, error: fetchError } = await supabase
          .from('lead_generation')
          .select('id, campagna')
          .in('id', allOriginalLeadIds);
        if (fetchError) {
          console.error('Error fetching original campagna for leads:', fetchError);
        } else {
          leadCampagneMap = new Map(leadRows.map(r => [r.id, r.campagna || null]));
        }
      }

      // Per ogni gruppo venditore originale, sottoraggruppa per campagna e invoca una chiamata per gruppo
      for (const { venditore: originalVenditore, leadIds } of originalGroups) {
        const byCampagna = new Map<string, string[]>();
        for (const id of leadIds) {
          const camp = leadCampagneMap.get(id) ?? '';
          const key = camp || '__NO_CAMPAGNA__';
          if (!byCampagna.has(key)) byCampagna.set(key, []);
          byCampagna.get(key)!.push(id);
        }
        for (const [campKey, ids] of byCampagna) {
          const campagnaForCall = campKey === '__NO_CAMPAGNA__' ? undefined : campKey;
          console.log(`📤 Reassigning ${ids.length} leads back to ${originalVenditore} (campagna: ${campagnaForCall ?? 'nessuna'})`);
          await assignLeadsWithExclusions({
            ...pendingAssignmentData,
            numLead: ids.length,
            venditore: originalVenditore,
            campagna: campagnaForCall,
            specificLeadIds: ids,
            skipAlreadyAssignedCheck: true
          });
        }
      }

      // Now assign the remaining new leads + conflict leads going to target, ALL in one call
      const newLeadCount = pendingAssignmentData.numLead - alreadyAssignedLeads.length;
      
      if (targetLeadIds.length > 0 && newLeadCount > 0) {
        // We have both conflict leads and new leads going to target - two calls but same venditore
        // First assign the specific conflict leads
        console.log(`📤 Assigning ${targetLeadIds.length} conflict leads to target ${pendingAssignmentData.venditore}`);
        await assignLeadsWithExclusions({
          ...pendingAssignmentData,
          numLead: targetLeadIds.length,
          venditore: pendingAssignmentData.venditore,
          specificLeadIds: targetLeadIds,
          skipAlreadyAssignedCheck: true
        });
        // Then assign the new leads
        console.log(`📤 Assigning ${newLeadCount} new leads to ${pendingAssignmentData.venditore}`);
        await assignLeadsWithExclusions({
          ...pendingAssignmentData,
          numLead: newLeadCount
        });
      } else if (targetLeadIds.length > 0) {
        // Only conflict leads going to target
        console.log(`📤 Assigning ${targetLeadIds.length} conflict leads to target ${pendingAssignmentData.venditore}`);
        await assignLeadsWithExclusions({
          ...pendingAssignmentData,
          numLead: targetLeadIds.length,
          venditore: pendingAssignmentData.venditore,
          specificLeadIds: targetLeadIds,
          skipAlreadyAssignedCheck: true
        });
      } else if (newLeadCount > 0) {
        // Only new leads
        console.log(`📤 Assigning ${newLeadCount} new leads to ${pendingAssignmentData.venditore}`);
        await assignLeadsWithExclusions({
          ...pendingAssignmentData,
          numLead: newLeadCount
        });
      }

      toast.success(`Lead assegnati con successo`);
      
      // Reset form
      setNumLead("");
      setVenditore("");
      setCampagna("");
      
      // Refresh data
      fetchCampagne();
      updateAvailableLeads();
      
    } catch (error) {
      console.error("❌ Error in assignment:", error);
      const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
      toast.error(`Errore nell'assegnazione: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
      setShowAlreadyAssignedDialog(false);
      setAlreadyAssignedLeads([]);
      setPendingAssignmentData(null);
    }
  };

  const handleCloseAlreadyAssignedDialog = () => {
    setShowAlreadyAssignedDialog(false);
    setAlreadyAssignedLeads([]);
    setPendingAssignmentData(null);
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
    refreshUniqueSources: fetchUniqueSources,
    // Already assigned leads dialog
    showAlreadyAssignedDialog,
    alreadyAssignedLeads,
    handleConfirmAssignments,
    handleCloseAlreadyAssignedDialog
  };
}
