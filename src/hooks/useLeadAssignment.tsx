
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAllFonti, getAllCampagne, getUniqueSourcesFromLeads, syncSourcesToDatabase } from "@/services/databaseService";
import { assignLeadsWithExclusions, LeadAssignmentData, getAvailableLeadsCount } from "@/services/leadAssignmentService";
import { checkLeadsAssignability } from "@/services/leadAssignabilityService";

export function useLeadAssignment() {
  const [numLead, setNumLead] = useState("");
  const [venditore, setVenditore] = useState("");
  const [campagna, setCampagna] = useState("");
  const [salespeople, setSalespeople] = useState<{id: string; nome: string; cognome: string;}[]>([]);
  const [fonti, setFonti] = useState<{id: string; nome: string; descrizione?: string;}[]>([]);
  const [campagne, setCampagne] = useState<{id: string; nome: string; descrizione?: string;}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAssignability, setIsCheckingAssignability] = useState(false);
  const [excludedSources, setExcludedSources] = useState<string[]>([]);
  const [availableLeads, setAvailableLeads] = useState(0);
  const [uniqueSources, setUniqueSources] = useState<string[]>([]);

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    updateAvailableLeads();
  }, [excludedSources]);

  const initializeData = async () => {
    try {
      // Esegui verifica assegnabilità all'inizializzazione
      setIsCheckingAssignability(true);
      console.log("Verifica assegnabilità all'apertura...");
      
      const assignabilityResult = await checkLeadsAssignability();
      console.log(`Verifica completata: ${assignabilityResult.updated} lead aggiornati su ${assignabilityResult.totalChecked}`);
      
      if (assignabilityResult.updated > 0) {
        toast.success(`Aggiornati ${assignabilityResult.updated} lead per assegnabilità`);
      }
      
      // Carica tutti i dati in parallelo
      await Promise.all([
        fetchSalespeople(),
        fetchFonti(),
        fetchCampagne(),
        fetchUniqueSources()
      ]);
      
    } catch (error) {
      console.error("Errore nell'inizializzazione:", error);
      toast.error("Errore nel caricamento iniziale");
    } finally {
      setIsCheckingAssignability(false);
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
      // Usa la funzione ottimizzata del servizio che gestisce correttamente le esclusioni
      const count = await getAvailableLeadsCount(excludedSources);
      console.log(`Lead disponibili per assegnazione (escludendo call prenotate): ${count}`);
      setAvailableLeads(count);
    } catch (error) {
      console.error("Error fetching available leads:", error);
      setAvailableLeads(0);
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
    isCheckingAssignability,
    excludedSources,
    availableLeads,
    uniqueSources,
    addExcludedSource,
    removeExcludedSource,
    handleAssign,
    updateAvailableLeads
  };
}
