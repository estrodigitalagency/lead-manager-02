
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Salesperson {
  id: string;
  nome_venditore: string;
  sheets_file_id: string;
  sheets_tab_name: string;
}

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

export const fetchSalespeopleNames = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('salespeople_settings')
      .select('nome_venditore')
      .order('nome_venditore');
    
    if (error) {
      console.error("Error fetching salespeople:", error);
      return [];
    }
    
    return data.map(item => item.nome_venditore);
  } catch (error) {
    console.error("Failed to fetch salespeople:", error);
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
