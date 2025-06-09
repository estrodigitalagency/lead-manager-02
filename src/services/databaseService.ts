import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";
import { LeadLavorato } from "@/types/leadLavorato";

export const getRecentData = async (tableName: string, limit: number = 100): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(`Errore nel caricamento dei dati da ${tableName}:`, error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error(`Errore durante il recupero dei dati da ${tableName}:`, error);
    throw error;
  }
};

export const getUnassignedLeads = async (): Promise<Lead[]> => {
  try {
    const { data: leads, error } = await supabase
      .from('lead_generation')
      .select('*')
      .is('venditore', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Errore nel caricamento dei lead non assegnati:", error);
      throw error;
    }

    return leads || [];
  } catch (error) {
    console.error("Errore durante il recupero dei lead non assegnati:", error);
    throw error;
  }
};

export const addLead = async (leadData: Omit<Lead, 'id' | 'created_at'>): Promise<Lead | null> => {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .insert([leadData])
      .select()
      .single();

    if (error) {
      console.error("Errore durante l'aggiunta del lead:", error);
      throw error;
    }

    return data as Lead || null;
  } catch (error) {
    console.error("Errore durante l'aggiunta del lead:", error);
    throw error;
  }
};

export const addLeadLavorato = async (leadData: Omit<LeadLavorato, 'id' | 'created_at'>): Promise<LeadLavorato | null> => {
  try {
    const { data, error } = await supabase
      .from('lead_lavorati')
      .insert([leadData])
      .select()
      .single();

    if (error) {
      console.error("Errore durante l'aggiunta del lead lavorato:", error);
      throw error;
    }

    return data as LeadLavorato || null;
  } catch (error) {
    console.error("Errore durante l'aggiunta del lead lavorato:", error);
    throw error;
  }
};

export const filterLeads = async (tableName: string, filters: Record<string, any>) => {
  try {
    let query = supabase.from(tableName).select('*');
    
    // Gestione filtro di ricerca
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      query = query.or(`nome.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,telefono.ilike.%${searchTerm}%`);
    }
    
    // Gestione altri filtri esistenti
    if (filters.dataInizio) {
      query = query.gte('created_at', filters.dataInizio);
    }
    
    if (filters.dataFine) {
      const endDate = new Date(filters.dataFine);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }
    
    if (filters.nome) {
      query = query.ilike('nome', `%${filters.nome}%`);
    }
    
    if (filters.email) {
      query = query.ilike('email', `%${filters.email}%`);
    }
    
    if (filters.telefono) {
      query = query.ilike('telefono', `%${filters.telefono}%`);
    }
    
    if (filters.venditore) {
      query = query.ilike('venditore', `%${filters.venditore}%`);
    }
    
    if (filters.esito) {
      query = query.eq('esito', filters.esito);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false }).limit(1000);
    
    if (error) {
      console.error('Errore nel filtraggio:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Errore nel servizio di filtraggio:', error);
    throw error;
  }
};
