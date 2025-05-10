
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

export const fetchAssignmentHistory = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .select('*')
      .eq('assegnato', true)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error("Error fetching assignment history:", error);
      return [];
    }
    
    // Format the history entries
    return data.map(lead => {
      const date = new Date(lead.created_at).toLocaleDateString('it-IT');
      const time = new Date(lead.created_at).toLocaleTimeString('it-IT');
      return `${date} ${time} - ${lead.nome} ${lead.cognome} assegnato a ${lead.venditore || 'N/A'}${lead.campagna ? ` (Campagna: ${lead.campagna})` : ''}`;
    });
  } catch (error) {
    console.error("Failed to fetch assignment history:", error);
    return [];
  }
};
