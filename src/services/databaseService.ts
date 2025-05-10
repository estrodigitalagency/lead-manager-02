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

export const fetchAvailableLeads = async (): Promise<Lead[]> => {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .select('*')
      .eq('assegnabile', false)
      .is('venditore', null)
      .order('created_at', { ascending: false })

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

export const fetchSalespeople = async () => {
  try {
    const { data, error } = await supabase
      .from('salespeople_settings')
      .select('*');
    
    if (error) {
      console.error("Error fetching salespeople:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Error fetching salespeople:", error);
    return [];
  }
};

export const updateSalespersonSettings = async (id: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('salespeople_settings')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      console.error("Error updating salesperson settings:", error);
      toast.error("Errore nell'aggiornamento delle impostazioni del venditore");
      return null;
    }
    
    toast.success("Impostazioni venditore aggiornate con successo!");
    return data;
  } catch (error) {
    console.error("Error updating salesperson settings:", error);
    toast.error("Errore nell'aggiornamento delle impostazioni del venditore");
    return null;
  }
};

export const createSalespersonSettings = async (settings: any) => {
  try {
    const { data, error } = await supabase
      .from('salespeople_settings')
      .insert([settings]);
    
    if (error) {
      console.error("Error creating salesperson settings:", error);
      toast.error("Errore nella creazione delle impostazioni del venditore");
      return null;
    }
    
    toast.success("Impostazioni venditore create con successo!");
    return data;
  } catch (error) {
    console.error("Error creating salesperson settings:", error);
    toast.error("Errore nella creazione delle impostazioni del venditore");
    return null;
  }
};

export const deleteSalespersonSettings = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('salespeople_settings')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error("Error deleting salesperson settings:", error);
      toast.error("Errore nell'eliminazione delle impostazioni del venditore");
      return null;
    }
    
    toast.success("Impostazioni venditore eliminate con successo!");
    return data;
  } catch (error) {
    console.error("Error deleting salesperson settings:", error);
    toast.error("Errore nell'eliminazione delle impostazioni del venditore");
    return null;
  }
};

export const fetchAttributionWindow = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('attribution_window')
      .select('days')
      .single();
    
    if (error) {
      console.error("Error fetching attribution window:", error);
      return 30; // Default value
    }
    
    return data?.days || 30;
  } catch (error) {
    console.error("Error fetching attribution window:", error);
    return 30; // Default value
  }
};

export const updateAttributionWindow = async (days: number) => {
  try {
    const { data, error } = await supabase
      .from('attribution_window')
      .update({ days: days })
      .eq('id', 1); // Assuming there's only one row
    
    if (error) {
      console.error("Error updating attribution window:", error);
      toast.error("Errore nell'aggiornamento della finestra di attribuzione");
      return null;
    }
    
    toast.success("Finestra di attribuzione aggiornata con successo!");
    return data;
  } catch (error) {
    console.error("Error updating attribution window:", error);
    toast.error("Errore nell'aggiornamento della finestra di attribuzione");
    return null;
  }
};

export const checkLeadsAssignability = async (): Promise<boolean> => {
  try {
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
