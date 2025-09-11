import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMarket } from '@/contexts/MarketContext';

export interface Campaign {
  id: string;
  nome: string;
  descrizione?: string;
  attivo: boolean;
  created_at: string;
  updated_at: string;
  fonti_incluse?: string[];
  fonti_escluse?: string[];
  source_mode?: 'exclude' | 'include';
  exclude_from_included?: string[];
  bypass_time_interval?: boolean;
}

export const useCampaignsData = () => {
  const { selectedMarket } = useMarket();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCampagne = async () => {
    try {
      const { data, error }: { data: any[] | null; error: any } = await supabase
        .from('database_campagne')
        .select('*')
        .eq('market', selectedMarket) // Filter by selected market
        .order('nome', { ascending: true });

      if (error) throw error;
      setCampaigns(data?.map(campaign => ({
        ...campaign,
        source_mode: campaign.source_mode as 'exclude' | 'include' | undefined
      })) || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Errore nel caricamento delle campagne');
    } finally {
      setIsLoading(false);
    }
  };

  const addCampaign = async (campaignData: { 
    nome: string; 
    descrizione?: string;
    fonti_incluse?: string[];
    fonti_escluse?: string[];
    source_mode?: 'exclude' | 'include';
    exclude_from_included?: string[];
    bypass_time_interval?: boolean;
  }) => {
    try {
      const { error }: { error: any } = await supabase
        .from('database_campagne')
        .insert([{ ...campaignData, market: selectedMarket }]); // Add market to new campaigns

      if (error) throw error;
      
      toast.success('Campagna aggiunta con successo');
      await fetchCampagne();
    } catch (error) {
      console.error('Error adding campaign:', error);
      toast.error('Errore nell\'aggiunta della campagna');
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    try {
      const { error } = await supabase
        .from('database_campagne')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Campagna aggiornata con successo');
      await fetchCampagne();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Errore nell\'aggiornamento della campagna');
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      const { error } = await supabase
        .from('database_campagne')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Campagna eliminata con successo');
      await fetchCampagne();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Errore nell\'eliminazione della campagna');
    }
  };

  useEffect(() => {
    fetchCampagne();
  }, [selectedMarket]);  // CRITICO: Refetch quando cambia market

  return {
    campaigns,
    isLoading,
    refetch: fetchCampagne,
    addCampaign,
    updateCampaign,
    deleteCampaign
  };
};