
import { supabase } from "@/integrations/supabase/client";

export const fetchSalespeople = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('venditori')
      .select('nome')
      .order('nome');
    
    if (error) {
      console.error("Error fetching salespeople:", error);
      return [];
    }
    
    return data.map(item => item.nome);
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
      .not('assignable', 'is', false)
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
      let message = `${date} ${time} - ${lead.nome} assegnato`;
      
      // Add campaign info only if the property exists and has a value
      if ('campagna' in lead && lead.campagna) {
        message += ` (Campagna: ${lead.campagna})`;
      }
      
      return message;
    });
  } catch (error) {
    console.error("Failed to fetch assignment history:", error);
    return [];
  }
};
