import { Lead } from "@/types/lead";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Get all leads that haven't been assigned yet
export async function getUnassignedLeads(): Promise<Lead[]> {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .select('*')
      .eq('assegnabile', false);
    
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
export async function addLead(lead: Omit<Lead, 'id' | 'assegnabile' | 'created_at'>): Promise<Lead | null> {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .insert({
        ...lead,
        assegnabile: false
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
      .eq('assegnabile', false)
      .order('created_at', { ascending: true })
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
        assegnabile: true,
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

// Funzione per ottenere e aggiornare le impostazioni di sistema
export async function getSystemSettings(key: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .single();
    
    if (error) {
      console.error(`Error fetching ${key} setting:`, error);
      return null;
    }
    
    return data?.value || null;
  } catch (error) {
    console.error(`Error fetching ${key} setting:`, error);
    return null;
  }
}

export async function updateSystemSettings(key: string, value: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('system_settings')
      .update({ 
        value, 
        updated_at: new Date().toISOString() // Convert Date to ISO string
      })
      .eq('key', key);
    
    if (error) {
      console.error(`Error updating ${key} setting:`, error);
      toast.error(`Errore nell'aggiornamento dell'impostazione ${key}`);
      return false;
    }
    
    toast.success("Impostazione aggiornata con successo");
    return true;
  } catch (error) {
    console.error(`Error updating ${key} setting:`, error);
    toast.error(`Errore nell'aggiornamento dell'impostazione ${key}`);
    return false;
  }
}

// Funzione per importare lead da CSV
export async function importLeadsFromCSV(leads: Omit<Lead, 'id' | 'assegnabile' | 'created_at'>[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('lead_generation')
      .insert(leads.map(lead => ({ ...lead, assegnabile: false })));
    
    if (error) {
      console.error("Error importing leads:", error);
      toast.error("Errore nell'importazione dei lead");
      return false;
    }
    
    toast.success(`${leads.length} lead importati con successo`);
    return true;
  } catch (error) {
    console.error("Error importing leads:", error);
    toast.error("Errore nell'importazione dei lead");
    return false;
  }
}

// Check if a lead is assignable based on creation date and booking status
export async function checkLeadsAssignability(): Promise<void> {
  try {
    // Get the assignability window setting
    const assignabilityWindow = await getSystemSettings('lead_assignability_window_days');
    const windowDays = assignabilityWindow ? parseInt(assignabilityWindow) : 0;
    
    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);
    const cutoffDateStr = cutoffDate.toISOString();
    
    console.log(`Checking leads assignability with cutoff date: ${cutoffDateStr}`);
    
    // Update leads that meet the criteria: created before cutoff date and no booked call
    // Fix the error by calling the RPC without parameters
    const { data, error } = await supabase
      .rpc('check_leads_assignability');
    
    if (error) {
      console.error("Error checking leads assignability:", error);
      toast.error("Errore nel controllo dell'assegnabilità dei lead");
      return;
    }
    
    console.log(`Updated ${data || 0} leads assignability status`);
    
  } catch (error) {
    console.error("Error checking leads assignability:", error);
  }
}
