
import { supabase } from "@/integrations/supabase/client";

export const fetchSalespeople = async (): Promise<string[]> => {
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
