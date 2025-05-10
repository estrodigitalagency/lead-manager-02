
import { supabase } from "@/integrations/supabase/client";

export async function checkLeadsAssignability(): Promise<{ success: boolean; message: string; updated?: number }> {
  try {
    const { data, error } = await supabase.functions.invoke('check-assignability');
    
    if (error) {
      console.error("Error invoking check-assignability function:", error);
      return { 
        success: false, 
        message: "Errore nel controllo dell'assegnabilità dei lead" 
      };
    }
    
    return data as { success: boolean; message: string; updated?: number };
  } catch (error) {
    console.error("Error checking leads assignability:", error);
    return { 
      success: false, 
      message: "Errore nel controllo dell'assegnabilità dei lead" 
    };
  }
}
