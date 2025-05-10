
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const getSystemSettings = async (key: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .single();
    
    if (error) {
      console.error(`Error fetching system setting ${key}:`, error);
      return null;
    }
    
    return data?.value || null;
  } catch (error) {
    console.error(`Error fetching system setting ${key}:`, error);
    return null;
  }
};

export const updateSystemSettings = async (key: string, value: string): Promise<boolean> => {
  try {
    // Check if the setting already exists
    const { data: existingData } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', key)
      .single();
    
    let error;
    
    if (existingData) {
      // Update existing setting
      const { error: updateError } = await supabase
        .from('system_settings')
        .update({ value })
        .eq('key', key);
      
      error = updateError;
    } else {
      // Insert new setting
      const { error: insertError } = await supabase
        .from('system_settings')
        .insert([{ key, value }]);
      
      error = insertError;
    }
    
    if (error) {
      console.error(`Error updating system setting ${key}:`, error);
      toast.error("Errore nell'aggiornamento delle impostazioni di sistema");
      return false;
    }
    
    toast.success("Impostazioni di sistema aggiornate con successo!");
    return true;
  } catch (error) {
    console.error(`Error updating system setting ${key}:`, error);
    toast.error("Errore nell'aggiornamento delle impostazioni di sistema");
    return false;
  }
};
