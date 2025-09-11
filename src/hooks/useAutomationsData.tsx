import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LeadAssignmentAutomation } from "@/types/automation";
import { useMarket } from "@/contexts/MarketContext";

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
      
      const typedData: LeadAssignmentAutomation[] = (data || []).map(item => ({
        ...item,
        trigger_when: item.trigger_when as 'new_lead' | 'duplicate_different_source',
        trigger_field: item.trigger_field as 'ultima_fonte' | 'fonte' | 'nome' | 'email' | 'telefono' | 'campagna' | 'lead_score' | 'created_at',
        condition_type: item.condition_type as 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'not_contains',
        action_type: item.action_type as 'assign_to_seller' | 'assign_to_previous_seller'
      }));
      
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
      const { data, error } = await supabase
        .from('lead_assignment_automations')
        .insert([{ ...automation, market: selectedMarket }])
        .select()
        .single();
      
      if (error) throw error;
      
      await fetchAutomations();
      toast.success("Automazione creata con successo");
      return data;
    } catch (error) {
      console.error("Error creating automation:", error);
      toast.error("Errore nella creazione dell'automazione");
      throw error;
    }
  };

  const updateAutomation = async (id: string, updates: Partial<LeadAssignmentAutomation>) => {
    try {
      const { error } = await supabase
        .from('lead_assignment_automations')
        .update(updates)
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
      const { error } = await supabase
        .from('lead_assignment_automations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await fetchAutomations();
      toast.success("Automazione eliminata con successo");
    } catch (error) {
      console.error("Error deleting automation:", error);
      toast.error("Errore nell'eliminazione dell'automazione");
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

  return {
    automations,
    isLoading,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
    updatePriorities,
    refetch: fetchAutomations
  };
};