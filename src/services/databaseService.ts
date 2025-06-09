
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";
import { LeadLavorato } from "@/types/leadLavorato";

type TableName = 'lead_generation' | 'booked_call' | 'lead_lavorati';

export const getRecentData = async (tableName: TableName, limit: number = 100): Promise<any[]> => {
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

export const filterLeads = async (tableName: TableName, filters: Record<string, any>) => {
  try {
    // Start with a fresh query builder for each filter operation
    let query: any = supabase.from(tableName).select('*');
    
    // Apply search filter first if it exists
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      query = supabase.from(tableName).select('*').or(`nome.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,telefono.ilike.%${searchTerm}%`);
    }
    
    // Rebuild query with additional filters
    const conditions: string[] = [];
    
    if (filters.dataInizio) {
      conditions.push(`created_at.gte.${filters.dataInizio}`);
    }
    
    if (filters.dataFine) {
      const endDate = new Date(filters.dataFine);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(`created_at.lte.${endDate.toISOString()}`);
    }
    
    if (filters.nome) {
      conditions.push(`nome.ilike.%${filters.nome}%`);
    }
    
    if (filters.email) {
      conditions.push(`email.ilike.%${filters.email}%`);
    }
    
    if (filters.telefono) {
      conditions.push(`telefono.ilike.%${filters.telefono}%`);
    }
    
    if (filters.venditore) {
      conditions.push(`venditore.ilike.%${filters.venditore}%`);
    }
    
    if (filters.esito) {
      conditions.push(`esito.eq.${filters.esito}`);
    }
    
    // Apply additional conditions using and() if we have them
    if (conditions.length > 0) {
      if (filters.search) {
        // If we already have a search filter, combine with and()
        query = query.and(conditions.join(','));
      } else {
        // No search filter, just apply regular filters
        query = supabase.from(tableName).select('*');
        for (const condition of conditions) {
          const [field, operator, value] = condition.split('.');
          switch (operator) {
            case 'gte':
              query = query.gte(field, value);
              break;
            case 'lte':
              query = query.lte(field, value);
              break;
            case 'ilike':
              query = query.ilike(field, value);
              break;
            case 'eq':
              query = query.eq(field, value);
              break;
          }
        }
      }
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

export const triggerLeadCheck = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('check_leads_assignability');
    
    if (error) {
      console.error('Errore nel controllo dei lead:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Errore durante il controllo dei lead:', error);
    throw error;
  }
};

export const getTableCounts = async () => {
  try {
    const [totalResult, assignableResult, assignedResult, bookedResult] = await Promise.all([
      supabase.from('lead_generation').select('id', { count: 'exact', head: true }),
      supabase.from('lead_generation').select('id', { count: 'exact', head: true }).eq('assignable', true),
      supabase.from('lead_generation').select('id', { count: 'exact', head: true }).not('venditore', 'is', null),
      supabase.from('booked_call').select('id', { count: 'exact', head: true })
    ]);

    return {
      total: totalResult.count || 0,
      assignable: assignableResult.count || 0,
      assigned: assignedResult.count || 0,
      booked: bookedResult.count || 0
    };
  } catch (error) {
    console.error('Errore nel conteggio delle tabelle:', error);
    throw error;
  }
};

export const getVendorStats = async () => {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .select('venditore')
      .not('venditore', 'is', null);

    if (error) {
      console.error('Errore nel recupero statistiche venditori:', error);
      throw error;
    }

    const vendorCounts = (data || []).reduce((acc: Record<string, number>, lead) => {
      if (lead.venditore) {
        acc[lead.venditore] = (acc[lead.venditore] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(vendorCounts).map(([name, value]) => ({
      name,
      value
    }));
  } catch (error) {
    console.error('Errore nelle statistiche venditori:', error);
    throw error;
  }
};

// Functions for managing sources and campaigns
export const getAllFonti = async () => {
  try {
    const { data, error } = await supabase
      .from('database_fonti')
      .select('*')
      .eq('attivo', true)
      .order('nome');

    if (error) {
      console.error('Errore nel recupero delle fonti:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Errore nel recupero delle fonti:', error);
    throw error;
  }
};

export const getAllCampagne = async () => {
  try {
    const { data, error } = await supabase
      .from('database_campagne')
      .select('*')
      .eq('attivo', true)
      .order('nome');

    if (error) {
      console.error('Errore nel recupero delle campagne:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Errore nel recupero delle campagne:', error);
    throw error;
  }
};

export const addCampagna = async (nome: string, descrizione?: string) => {
  try {
    const { data, error } = await supabase
      .from('database_campagne')
      .insert([{ nome, descrizione }])
      .select()
      .single();

    if (error) {
      console.error('Errore nell\'aggiunta della campagna:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Errore nell\'aggiunta della campagna:', error);
    throw error;
  }
};

// Function to get unique sources from lead data, handling comma-separated values
export const getUniqueSourcesFromLeads = async () => {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .select('fonte')
      .not('fonte', 'is', null)
      .neq('fonte', '');

    if (error) {
      console.error('Errore nel recupero delle fonti uniche:', error);
      throw error;
    }

    // Process comma-separated sources and create unique list
    const uniqueSources = new Set<string>();
    
    data?.forEach(record => {
      if (record.fonte) {
        // Split by comma and trim each value
        const sources = record.fonte.split(',').map(s => s.trim()).filter(s => s.length > 0);
        sources.forEach(source => uniqueSources.add(source));
      }
    });

    // Convert Set to sorted array
    return Array.from(uniqueSources).sort();
  } catch (error) {
    console.error('Errore nel recupero delle fonti uniche:', error);
    throw error;
  }
};

// Function to add unique sources to database_fonti table
export const syncSourcesToDatabase = async () => {
  try {
    const uniqueSources = await getUniqueSourcesFromLeads();
    
    // Insert unique sources into database_fonti table
    for (const source of uniqueSources) {
      try {
        await supabase
          .from('database_fonti')
          .insert([{ nome: source }])
          .select()
          .single();
      } catch (error) {
        // Ignore duplicate key errors, source already exists
        console.log(`Fonte già esistente: ${source}`);
      }
    }
    
    return uniqueSources;
  } catch (error) {
    console.error('Errore nella sincronizzazione delle fonti:', error);
    throw error;
  }
};

export const markLeadsAsAssigned = async (
  numLead: number, 
  venditore: string, 
  campagna?: string,
  webhookUrl?: string
): Promise<any[]> => {
  try {
    // If a campaign is provided, save it to the database
    if (campagna && campagna.trim()) {
      try {
        await addCampagna(campagna.trim());
      } catch (error) {
        // Ignore duplicate key errors, campaign already exists
        console.log('Campagna già esistente o errore nell\'aggiunta:', error);
      }
    }

    // Ottieni i lead disponibili per l'assegnazione
    const { data: availableLeads, error: fetchError } = await supabase
      .from('lead_generation')
      .select('*')
      .eq('assignable', true)
      .is('venditore', null)
      .order('created_at', { ascending: true })
      .limit(numLead);

    if (fetchError) {
      console.error('Errore nel recupero dei lead:', fetchError);
      throw fetchError;
    }

    if (!availableLeads || availableLeads.length === 0) {
      throw new Error('Nessun lead disponibile per l\'assegnazione');
    }

    // Aggiorna i lead con il venditore assegnato
    const leadIds = availableLeads.map(lead => lead.id);
    const { data: updatedLeads, error: updateError } = await supabase
      .from('lead_generation')
      .update({ 
        venditore,
        campagna: campagna || null,
        updated_at: new Date().toISOString()
      })
      .in('id', leadIds)
      .select();

    if (updateError) {
      console.error('Errore nell\'aggiornamento dei lead:', updateError);
      throw updateError;
    }

    // Registra l'assegnazione nello storico
    const { error: historyError } = await supabase
      .from('assignment_history')
      .insert({
        leads_count: updatedLeads?.length || 0,
        venditore,
        campagna: campagna || null,
        fonti_escluse: null // Potrà essere implementato in futuro
      });

    if (historyError) {
      console.error('Errore nel salvataggio dello storico:', historyError);
      // Non lanciamo l'errore per non bloccare l'assegnazione
    }

    return updatedLeads || [];
  } catch (error) {
    console.error('Errore nell\'assegnazione dei lead:', error);
    throw error;
  }
};
