
import { Lead } from "@/types/lead";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Get all leads that haven't been assigned yet
export async function getUnassignedLeads(): Promise<Lead[]> {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .select('*')
      .eq('assegnato', false);
    
    if (error) {
      console.error("Error fetching unassigned leads:", error);
      toast.error("Errore nel recupero dei lead non assegnati");
      return [];
    }
    
    return data as Lead[];
  } catch (error) {
    console.error("Error fetching unassigned leads:", error);
    toast.error("Errore nel recupero dei lead non assegnati");
    return [];
  }
}

// Add a new lead (e.g. from webhook)
export async function addLead(lead: Omit<Lead, 'id' | 'assegnato'>): Promise<Lead | null> {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .insert({
        ...lead,
        assegnato: false
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error adding lead:", error);
      toast.error("Errore nell'aggiunta del nuovo lead");
      return null;
    }
    
    return data as Lead;
  } catch (error) {
    console.error("Error adding lead:", error);
    toast.error("Errore nell'aggiunta del nuovo lead");
    return null;
  }
}

// Mark leads as assigned
export async function markLeadsAsAssigned(numLeads: number, venditore: string, campagna?: string): Promise<Lead[]> {
  try {
    // Get unassigned leads up to the requested number
    const { data: leadsToAssign, error: fetchError } = await supabase
      .from('lead_generation')
      .select('*')
      .eq('assegnato', false)
      .order('data_generazione', { ascending: true })
      .limit(numLeads);
    
    if (fetchError || !leadsToAssign || leadsToAssign.length < numLeads) {
      console.error("Error fetching leads to assign:", fetchError);
      toast.error(`Solo ${leadsToAssign?.length || 0} lead disponibili per l'assegnazione.`);
      if (!leadsToAssign) return [];
    }
    
    // Update leads to mark them as assigned
    const leadIds = leadsToAssign?.map(lead => lead.id) || [];
    
    if (leadIds.length === 0) {
      return [];
    }
    
    const { error: updateError } = await supabase
      .from('lead_generation')
      .update({ 
        assegnato: true,
        venditore,
        campagna
      })
      .in('id', leadIds);
    
    if (updateError) {
      console.error("Error marking leads as assigned:", updateError);
      toast.error("Errore nell'assegnazione dei lead");
      return [];
    }
    
    // Return the assigned leads
    return leadsToAssign as Lead[];
  } catch (error) {
    console.error("Error marking leads as assigned:", error);
    toast.error("Errore nell'assegnazione dei lead");
    return [];
  }
}
