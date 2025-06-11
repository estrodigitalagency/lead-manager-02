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
    // Query ottimizzata con indici
    const { data: leads, error } = await supabase
      .from('lead_generation')
      .select('*')
      .is('venditore', null)
      .neq('booked_call', 'SI') // Escludi lead con call prenotate
      .eq('assignable', true) // Solo lead assegnabili
      .order('created_at', { ascending: false })
      .limit(500); // Limita per performance

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

// Funzione corretta per eliminazione singola
export const deleteLead = async (tableName: TableName, id: string): Promise<boolean> => {
  try {
    console.log(`Eliminazione del record ${id} dalla tabella ${tableName}`);
    
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Errore durante l'eliminazione del record ${id}:`, error);
      throw new Error(`Errore eliminazione: ${error.message}`);
    }

    console.log(`Record ${id} eliminato con successo dalla tabella ${tableName}`);
    return true;
  } catch (error) {
    console.error(`Errore durante l'eliminazione del record ${id}:`, error);
    throw error;
  }
};

// Funzione migliorata per eliminazione multipla con batching
export const deleteMultipleLeads = async (tableName: TableName, ids: string[]): Promise<boolean> => {
  try {
    console.log(`Eliminazione di ${ids.length} record dalla tabella ${tableName}`);
    
    if (!ids || ids.length === 0) {
      throw new Error('Nessun ID fornito per l\'eliminazione');
    }

    // Batch size of 100 records at a time to avoid request timeouts
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < ids.length; i += batchSize) {
      batches.push(ids.slice(i, i + batchSize));
    }

    console.log(`Eliminazione in ${batches.length} batch di massimo ${batchSize} record ciascuno`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Elaborazione batch ${i + 1}/${batches.length} con ${batch.length} record`);
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .in('id', batch);

      if (error) {
        console.error(`Errore durante l'eliminazione del batch ${i + 1}:`, error);
        throw new Error(`Errore eliminazione batch ${i + 1}: ${error.message}`);
      }

      console.log(`Batch ${i + 1}/${batches.length} eliminato con successo`);
    }

    console.log(`${ids.length} record eliminati con successo dalla tabella ${tableName}`);
    return true;
  } catch (error) {
    console.error(`Errore durante l'eliminazione multipla:`, error);
    throw error;
  }
};

export const filterLeads = async (tableName: TableName, filters: Record<string, any>) => {
  try {
    // Query ottimizzata per filtri
    let query: any = supabase.from(tableName).select('*');
    
    // Costruzione query ottimizzata
    const conditions: string[] = [];
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      query = query.or(`nome.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,telefono.ilike.%${searchTerm}%`);
    }
    
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
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1000);
    
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
    // Query parallele ottimizzate con indici
    const [totalResult, assignableResult, assignedResult, bookedResult] = await Promise.all([
      supabase.from('lead_generation').select('id', { count: 'exact', head: true }),
      supabase.from('lead_generation').select('id', { count: 'exact', head: true })
        .eq('assignable', true)
        .is('venditore', null)
        .neq('booked_call', 'SI'),
      supabase.from('lead_generation').select('id', { count: 'exact', head: true })
        .not('venditore', 'is', null),
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
    // Query ottimizzata per statistiche venditori
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
    // Query ottimizzata con cache
    const { data, error } = await supabase
      .from('lead_generation')
      .select('fonte')
      .not('fonte', 'is', null)
      .neq('fonte', '');

    if (error) {
      console.error('Errore nel recupero delle fonti uniche:', error);
      throw error;
    }

    // Elaborazione ottimizzata delle fonti
    const uniqueSources = new Set<string>();
    
    data?.forEach(record => {
      if (record.fonte) {
        const sources = record.fonte.split(',').map(s => s.trim()).filter(s => s.length > 0);
        sources.forEach(source => uniqueSources.add(source));
      }
    });

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
    // Salva campagna se fornita
    if (campagna && campagna.trim()) {
      try {
        await addCampagna(campagna.trim());
      } catch (error) {
        console.log('Campagna già esistente o errore nell\'aggiunta:', error);
      }
    }

    // Query ottimizzata per ottenere lead disponibili
    const { data: availableLeads, error: fetchError } = await supabase
      .from('lead_generation')
      .select('*')
      .eq('assignable', true)
      .is('venditore', null)
      .neq('booked_call', 'SI') // Condizione critica per escludere call prenotate
      .order('created_at', { ascending: true })
      .limit(numLead);

    if (fetchError) {
      console.error('Errore nel recupero dei lead:', fetchError);
      throw fetchError;
    }

    if (!availableLeads || availableLeads.length === 0) {
      throw new Error('Nessun lead disponibile per l\'assegnazione');
    }

    // Verifica finale che i lead non abbiano call prenotate
    const validLeads = availableLeads.filter(lead => lead.booked_call !== 'SI');
    
    if (validLeads.length < numLead) {
      console.warn(`Solo ${validLeads.length} lead validi trovati su ${numLead} richiesti`);
    }

    const leadsToUpdate = validLeads.slice(0, numLead);
    const leadIds = leadsToUpdate.map(lead => lead.id);

    // Aggiorna i lead selezionati
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
        fonti_escluse: null
      });

    if (historyError) {
      console.error('Errore nel salvataggio dello storico:', historyError);
    }

    return updatedLeads || [];
  } catch (error) {
    console.error('Errore nell\'assegnazione dei lead:', error);
    throw error;
  }
};

export const getLeadById = async (id: string): Promise<Lead | null> => {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .select('*')
      .eq('id', id);

    if (error) {
      console.error(`Errore nel caricamento del lead con id ${id}:`, error);
      throw error;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error(`Errore durante il recupero del lead con id ${id}:`, error);
    throw error;
  }
};
