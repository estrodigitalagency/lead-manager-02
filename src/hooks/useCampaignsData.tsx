import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Campaign {
  id: string;
  nome: string;
  descrizione?: string;
  attivo: boolean;
  created_at: string;
  updated_at: string;
}

export const useCampaignsData = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('database_campagne')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Errore nel caricamento delle campagne');
    } finally {
      setIsLoading(false);
    }
  };

  const addCampaign = async (campaignData: { nome: string; descrizione?: string }) => {
    try {
      const { error } = await supabase
        .from('database_campagne')
        .insert([campaignData]);

      if (error) throw error;
      
      toast.success('Campagna aggiunta con successo');
      await fetchCampaigns();
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
      await fetchCampaigns();
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
      await fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Errore nell\'eliminazione della campagna');
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return {
    campaigns,
    isLoading,
    refetch: fetchCampaigns,
    addCampaign,
    updateCampaign,
    deleteCampaign
  };
};