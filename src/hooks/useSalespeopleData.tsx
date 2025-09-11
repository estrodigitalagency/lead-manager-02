
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Venditore } from "@/types/venditore";
import { useMarket } from "@/contexts/MarketContext";

export const useSalespeopleData = () => {
  const { selectedMarket } = useMarket();
  const [venditori, setVenditori] = useState<Venditore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVenditori = async () => {
    try {
      const { data, error } = await supabase
        .from('venditori')
        .select('id, nome, cognome, email, telefono, sheets_file_id, sheets_tab_name, stato, created_at')
        .order('nome');
      
      if (error) throw error;
      
      const typedData: Venditore[] = (data || []).map(item => ({
        ...item,
        stato: item.stato as 'attivo' | 'inattivo'
      }));
      
      setVenditori(typedData);
    } catch (error) {
      console.error("Error fetching venditori:", error);
      toast.error("Errore nel caricamento dei venditori");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVenditori();
  }, []);

  return {
    venditori,
    isLoading,
    refetch: fetchVenditori
  };
};
