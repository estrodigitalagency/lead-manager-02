
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";
import { toast } from "sonner";

export const assignLeadToSalesperson = async (leadId: string, salesperson: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('lead_generation')
      .update({ assegnabile: true, venditore: salesperson })
      .eq('id', leadId);

    if (error) {
      console.error("Error assigning lead:", error);
      toast.error("Errore nell'assegnazione del lead");
      return false;
    }

    toast.success("Lead assegnato con successo!");
    return true;
  } catch (error) {
    console.error("Error assigning lead:", error);
    toast.error("Errore nell'assegnazione del lead");
    return false;
  }
};

export const getUnassignedLeads = async (): Promise<Lead[]> => {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .select('*')
      .eq('assegnabile', false)
      .is('venditore', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching leads:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching leads:", error);
    return [];
  }
};

export const markLeadsAsAssigned = async (numLeads: number, venditore: string, campagna?: string): Promise<Lead[]> => {
  try {
    // Get unassigned leads
    const unassignedLeads = await getUnassignedLeads();
    const leadsToAssign = unassignedLeads.slice(0, numLeads);
    
    if (leadsToAssign.length === 0) {
      return [];
    }
    
    // Extract IDs to update
    const leadIds = leadsToAssign.map(lead => lead.id);
    
    // Update the leads
    const { error } = await supabase
      .from('lead_generation')
      .update({ 
        assegnabile: true, 
        venditore: venditore,
        campagna: campagna || leadsToAssign[0].campagna
      })
      .in('id', leadIds);
    
    if (error) {
      console.error("Error marking leads as assigned:", error);
      return [];
    }
    
    return leadsToAssign;
  } catch (error) {
    console.error("Error marking leads as assigned:", error);
    return [];
  }
};

export const fetchAvailableLeads = async (): Promise<Lead[]> => {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .select('*')
      .eq('assegnabile', false)
      .is('venditore', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching leads:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching leads:", error);
    return [];
  }
};

export const fetchAssignmentHistory = async (): Promise<Lead[]> => {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .select('*')
      .not('venditore', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching assignment history:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching assignment history:", error);
    return [];
  }
};

export const importLeadsFromCSV = async (leads: any[]): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('lead_generation')
      .insert(leads);
    
    if (error) {
      console.error("Error importing leads:", error);
      toast.error("Errore nell'importazione dei lead");
      return false;
    }
    
    toast.success(`Importati ${leads.length} lead con successo!`);
    return true;
  } catch (error) {
    console.error("Error importing leads:", error);
    toast.error("Errore nell'importazione dei lead");
    return false;
  }
};

export const addLead = async (lead: Lead): Promise<any> => {
  try {
    const { error } = await supabase
      .from('lead_generation')
      .insert([lead]);
    
    if (error) {
      console.error("Error adding lead:", error);
      toast.error("Errore nell'aggiunta del lead");
      return null;
    }
    
    return true;
  } catch (error) {
    console.error("Error adding lead:", error);
    toast.error("Errore nell'aggiunta del lead");
    return null;
  }
};

export const checkLeadsAssignability = async (): Promise<boolean> => {
  try {
    // Call the RPC function without any arguments
    const { data, error } = await supabase.rpc('check_leads_assignability');
    
    if (error) {
      console.error('Error checking leads assignability:', error);
      return false;
    }
    
    return data || false;
  } catch (error) {
    console.error('Error checking leads assignability:', error);
    return false;
  }
};
