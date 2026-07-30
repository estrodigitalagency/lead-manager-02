import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LeadAssignmentAutomation } from "@/types/automation";
import { useMarket } from "@/contexts/MarketContext";

// Soft-delete automazioni: la FK automation_executions.automation_id (RESTRICT) e la RLS
// impediscono di cancellare un'automazione con storico esecuzioni. Invece di cancellare
// (e perdere lo storico) la nascondiamo: id in questa lista (system_settings) + attivo=false.
const HIDDEN_KEY = "automations_hidden";
const readHiddenAutomations = async (): Promise<string[]> => {
  const { data } = await supabase.from("system_settings").select("value").eq("key", HIDDEN_KEY).maybeSingle();
  try {
    const p = JSON.parse(data?.value || "[]");
    return Array.isArray(p) ? (p as string[]) : [];
  } catch {
    return [];
  }
};

export const useAutomationsData = () => {
  const { selectedMarket } = useMarket();
  const [automations, setAutomations] = useState<LeadAssignmentAutomation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAutomations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('lead_assignment_automations')
        .select('*')
        .eq('market', selectedMarket)
        .order('priority', { ascending: true });
      
      if (error) throw error;

      const hidden = await readHiddenAutomations();
      const typedData = (data || []).filter(item => !hidden.includes(item.id)).map(item => ({
        ...item,
        trigger_when: item.trigger_when as 'new_lead' | 'duplicate_different_source',
        trigger_field: item.trigger_field as 'ultima_fonte' | 'fonte' | 'nome' | 'email' | 'telefono' | 'campagna' | 'lead_score' | 'created_at',
        condition_type: item.condition_type as 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'not_contains',
        action_type: item.action_type as 'assign_to_seller' | 'assign_to_previous_seller' | 'weighted_distribution',
        distribution_mode: (item as any).distribution_mode as any,
      })) as unknown as LeadAssignmentAutomation[];

      setAutomations(typedData);
    } catch (error) {
      console.error("Error fetching automations:", error);
      toast.error("Errore nel caricamento delle automazioni");
    } finally {
      setIsLoading(false);
    }
  };

  const createAutomation = async (automation: Omit<LeadAssignmentAutomation, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Convert empty string to null for UUID field
      const cleanedAutomation = {
        ...automation,
        target_seller_id: automation.target_seller_id && automation.target_seller_id.trim() !== '' ? automation.target_seller_id : null,
        excluded_sellers: automation.excluded_sellers || [],
        market: selectedMarket
      };

      const { data, error } = await supabase
        .from('lead_assignment_automations')
        .insert([cleanedAutomation as any])
        .select()
        .single();
      
      if (error) throw error;
      
      await fetchAutomations();
      toast.success("Automazione creata con successo");
      return data;
    } catch (error) {
      console.error("Error creating automation:", error);
      const e = error as { message?: string; code?: string };
      toast.error(e?.message ? `Errore creazione: ${e.message}` : "Errore nella creazione dell'automazione");
      throw error;
    }
  };

  const updateAutomation = async (id: string, updates: Partial<LeadAssignmentAutomation>) => {
    try {
      const { error } = await supabase
        .from('lead_assignment_automations')
        .update(updates as any)
        .eq('id', id);
      
      if (error) throw error;
      
      await fetchAutomations();
      toast.success("Automazione aggiornata con successo");
    } catch (error) {
      console.error("Error updating automation:", error);
      toast.error("Errore nell'aggiornamento dell'automazione");
      throw error;
    }
  };

  const deleteAutomation = async (id: string) => {
    try {
      // Soft-delete: disattiva (così smette di girare) e nasconde dalla lista, MANTENENDO
      // l'automazione e il suo storico esecuzioni. L'hard-delete è impossibile: FK RESTRICT su
      // automation_executions + RLS che blocca il delete delle esecuzioni.
      const { error } = await supabase
        .from('lead_assignment_automations')
        .update({ attivo: false })
        .eq('id', id);
      if (error) throw error;

      const hidden = await readHiddenAutomations();
      if (!hidden.includes(id)) {
        const { error: hErr } = await supabase
          .from('system_settings')
          .upsert({ key: HIDDEN_KEY, value: JSON.stringify([...hidden, id]), descrizione: "Automazioni nascoste (soft-delete)" }, { onConflict: 'key' });
        if (hErr) throw hErr;
      }

      await fetchAutomations();
      toast.success("Automazione eliminata con successo");
    } catch (error) {
      console.error("Error deleting automation:", error);
      const e = error as { message?: string };
      toast.error(e?.message ? `Errore eliminazione: ${e.message}` : "Errore nell'eliminazione dell'automazione");
      throw error;
    }
  };

  const toggleAutomation = async (id: string, attivo: boolean) => {
    await updateAutomation(id, { attivo });
  };

  const updatePriorities = async (updatedAutomations: LeadAssignmentAutomation[]) => {
    try {
      const updates = updatedAutomations.map(automation => ({
        id: automation.id,
        priority: automation.priority
      }));

      for (const update of updates) {
        await supabase
          .from('lead_assignment_automations')
          .update({ priority: update.priority })
          .eq('id', update.id);
      }
      
      await fetchAutomations();
      toast.success("Priorità aggiornate con successo");
    } catch (error) {
      console.error("Error updating priorities:", error);
      toast.error("Errore nell'aggiornamento delle priorità");
      throw error;
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, [selectedMarket]); // Refetch when market changes

  const resetDistributionState = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lead_assignment_automations')
        .update({ distribution_state: { count_assigned: {}, total_assigned: 0, last_updated: new Date().toISOString() } as any })
        .eq('id', id);
      if (error) throw error;
      await fetchAutomations();
      toast.success('Contatori distribuzione azzerati');
    } catch (err) {
      console.error(err);
      toast.error('Errore azzeramento contatori');
    }
  };

  return {
    automations,
    isLoading,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
    updatePriorities,
    resetDistributionState,
    refetch: fetchAutomations
  };
};