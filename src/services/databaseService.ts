import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";
import { LeadLavorato } from "@/types/leadLavorato";

// Conversione iterativa wall-clock Europe/Rome → UTC, bulletproof su DST e tutti i browser.
function romeWallClockToUTC(dateString: string, timeString: string): Date {
  const getOffsetMs = (utcDate: Date): number => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Rome',
      hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).formatToParts(utcDate);
    const obj: Record<string, string> = {};
    parts.forEach(p => { if (p.type !== 'literal') obj[p.type] = p.value; });
    const wallAsUTC = Date.UTC(
      +obj.year, +obj.month - 1, +obj.day,
      +obj.hour === 24 ? 0 : +obj.hour, +obj.minute, +obj.second
    );
    return wallAsUTC - utcDate.getTime();
  };
  const guess = new Date(`${dateString}T${timeString}Z`);
  const firstOffset = getOffsetMs(guess);
  const refined = new Date(guess.getTime() - firstOffset);
  const secondOffset = getOffsetMs(refined);
  return new Date(guess.getTime() - secondOffset);
}

function getStartOfDayIT(dateString: string): string {
  return romeWallClockToUTC(dateString, '00:00:00').toISOString();
}

// Upper bound esclusivo: inizio del giorno successivo in Italia. Usare con .lt().
function getNextDayStartIT(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return getStartOfDayIT(next.toISOString().slice(0, 10));
}

type ValidTableName = "lead_generation" | "booked_call" | "lead_assignments" | "lead_lavorati" | "system_settings" | "venditori";

// Nuova interfaccia per i risultati paginati
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Nuova funzione per paginazione server-side
export async function getPaginatedData<T>(
  tableName: ValidTableName, 
  page: number = 1, 
  pageSize: number = 50,
  filters?: Record<string, any>,
  market: string = 'IT'
): Promise<PaginatedResult<T>> {
  try {
    let query: any = supabase.from(tableName).select('*', { count: 'exact' });
    
    // Apply market filter for relevant tables
    if (['lead_generation', 'booked_call', 'venditori', 'lead_lavorati'].includes(tableName)) {
      if (market === 'IT') {
        // Include legacy records without market for IT
        query = query.or('market.eq.IT,market.is.null');
      } else {
        query = query.eq('market', market);
      }
    }
    
    // Applica filtri se presenti
    if (filters) {
      // Filtro di ricerca generale - cerca in nome, email, telefono e cognome
      if (filters.search) {
        const searchTerm = filters.search.trim();
        console.log('Applying search filter:', searchTerm);
        
        // Costruisci condizioni OR per cercare in più campi
        const searchConditions = [];
        
        // Aggiungi condizioni per nome
        searchConditions.push(`nome.ilike.%${searchTerm}%`);
        
        // Aggiungi condizioni per cognome se esiste
        searchConditions.push(`cognome.ilike.%${searchTerm}%`);
        
        // Aggiungi condizioni per email
        searchConditions.push(`email.ilike.%${searchTerm}%`);
        
        // Aggiungi condizioni per telefono
        searchConditions.push(`telefono.ilike.%${searchTerm}%`);
        
        // Unisci tutte le condizioni con OR
        query = query.or(searchConditions.join(','));
      }
      
      // Filtri individuali (solo se non c'è ricerca generale)
      if (!filters.search) {
        if (filters.nome) {
          query = query.ilike('nome', `%${filters.nome}%`);
        }
        
        if (filters.email) {
          query = query.ilike('email', `%${filters.email}%`);
        }
        
        if (filters.telefono) {
          query = query.ilike('telefono', `%${filters.telefono}%`);
        }
      }
      
      if (filters.venditore) {
        query = query.ilike('venditore', `%${filters.venditore}%`);
      }
      
      if (filters.campagna) {
        query = query.ilike('campagna', `%${filters.campagna}%`);
      }
      
      if (filters.esito) {
        query = query.ilike('esito', `%${filters.esito}%`);
      }
      
      // Filtri per periodo (fuso orario italiano)
      if (filters.dataInizio) {
        query = query.gte('created_at', getStartOfDayIT(filters.dataInizio));
      }
      
      if (filters.dataFine) {
        query = query.lt('created_at', getNextDayStartIT(filters.dataFine));
      }

      // Filtri per fonte avanzati - usa colonna corretta in base alla tabella
      const fonteColumn = tableName === 'lead_generation' ? 'ultima_fonte' : 'fonte';
      if (filters.fontiIncluse && filters.fontiIncluse.length > 0) {
        console.log('Applying include fonte filter:', filters.fontiIncluse, 'on column:', fonteColumn);
        const conditions = filters.fontiIncluse.map((fonte: string) => `${fonteColumn}.ilike.${fonte}`).join(',');
        query = query.or(conditions);
      }
      
      if (filters.fontiEscluse && filters.fontiEscluse.length > 0) {
        console.log('Applying exclude fonte filter:', filters.fontiEscluse);
        filters.fontiEscluse.forEach((fonte: string) => {
          query = query.not(fonteColumn, 'ilike', fonte);
        });
      }

      // Filtro vendite chiuse
      if (filters.venditaChiusa === true) {
        query = query.eq('vendita_chiusa', true);
      }

      // Filtro call prenotata
      if (filters.bookedCall && filters.bookedCall !== 'all') {
        query = query.eq('booked_call', filters.bookedCall);
      }
    }
    
    // Ordina per data di creazione
    query = query.order('created_at', { ascending: false });
    
    // Applica paginazione
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);
    
    console.log(`Paginated ${tableName} results (market: ${market}): page ${page}, size ${pageSize}, total ${total}`);
    
    return {
      data: (data || []) as T[],
      total,
      page,
      pageSize,
      totalPages
    };
  } catch (error) {
    console.error(`Error fetching paginated data from ${tableName}:`, error);
    throw error;
  }
}

export async function getRecentData(tableName: ValidTableName, limit: number = 100, market: string = 'IT'): Promise<any[]> {
  try {
    let query: any = supabase.from(tableName).select('*');
    
    // Apply market filter for relevant tables
    if (['lead_generation', 'booked_call', 'venditori', 'lead_lavorati'].includes(tableName)) {
      if (market === 'IT') {
        query = query.or('market.eq.IT,market.is.null');
      } else {
        query = query.eq('market', market);
      }
    }
    
    const { data, error }: { data: any[] | null; error: any } = await query
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error fetching recent data from ${tableName}:`, error);
    throw error;
  }
}

export async function getUnassignedLeads(market: string = 'IT'): Promise<Lead[]> {
  try {
    // QUERY CRITICA: Escludere SEMPRE lead con call prenotate (booked_call = 'SI')
    const { data, error }: { data: any[] | null; error: any } = await supabase
      .from('lead_generation')
      .select('*')
      .eq('market', market) // Filter by market
      .eq('assignable', true)
      .is('venditore', null)
      .eq('booked_call', 'NO') // CRITICO: Solo lead senza call prenotate
      .eq('manually_not_assignable', false) // Escludi lead marcati manualmente come non assegnabili
      .order('created_at', { ascending: false })
      .limit(500);
    
    if (error) throw error;
    
    // Convert lead_score from string to number if needed
    const convertedData = (data || []).map(lead => ({
      ...lead,
      lead_score: lead.lead_score ? (typeof lead.lead_score === 'string' ? parseInt(lead.lead_score) : lead.lead_score) : undefined
    }));
    
    return convertedData;
  } catch (error) {
    console.error("Error fetching unassigned leads:", error);
    throw error;
  }
}

// filterLeads removed - use getPaginatedData instead

export async function bulkDeleteLeads(tableName: ValidTableName, ids: string[]) {
  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .in('id', ids);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error(`Error bulk deleting from ${tableName}:`, error);
    throw error;
  }
}

// Alias for compatibility
export const deleteMultipleLeads = bulkDeleteLeads;

export async function getAllFonti() {
  try {
    const { data, error } = await supabase
      .from('database_fonti')
      .select('*')
      .eq('attivo', true)
      .order('nome');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching fonti:", error);
    return [];
  }
}

export async function getAllCampagne(market: string = 'IT') {
  try {
    const { data, error }: { data: any[] | null; error: any } = await supabase
      .from('database_campagne')
      .select('*')
      .eq('market', market) // Filter by market
      .eq('attivo', true)
      .order('nome');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching campagne:", error);
    return [];
  }
}

export async function getUniqueSourcesFromLeads(_market?: string): Promise<string[]> {
  try {
    console.log(`🔍 getUniqueSourcesFromLeads: Fetching from database_fonti + lead_generation`);

    // Fetch from database_fonti (curated list)
    const { data: fontiData, error: fontiError } = await supabase
      .from('database_fonti')
      .select('nome')
      .eq('attivo', true)
      .order('nome');

    if (fontiError) throw fontiError;

    const fontiSources = new Set((fontiData || []).map(f => f.nome).filter(Boolean));

    // Also fetch recent distinct ultima_fonte from lead_generation to catch new sources not yet in database_fonti
    // NOTE: we read most recent rows first so newly arrived leads are immediately available in selectors
    let leadSourcesQuery = supabase
      .from('lead_generation')
      .select('ultima_fonte')
      .not('ultima_fonte', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10000);

    if (_market) {
      leadSourcesQuery = leadSourcesQuery.eq('market', _market);
    }

    const { data: leadSources, error: leadError } = await leadSourcesQuery;

    if (!leadError && leadSources) {
      const uniqueLeadSources = new Set(leadSources.map(l => l.ultima_fonte).filter(Boolean));
      for (const src of uniqueLeadSources) {
        fontiSources.add(src as string);
      }
    }

    const sources = Array.from(fontiSources).sort();
    console.log(`✅ getUniqueSourcesFromLeads: Returning ${sources.length} sources (fonti + lead_generation)`);
    return sources;
  } catch (error) {
    console.error("❌ Error fetching unique sources:", error);
    return [];
  }
}

export async function syncSourcesToDatabase() {
  try {
    const uniqueSources = await getUniqueSourcesFromLeads();
    
    for (const source of uniqueSources) {
      const { error } = await supabase
        .from('database_fonti')
        .upsert(
          { nome: source, descrizione: `Fonte automatica: ${source}` },
          { onConflict: 'nome', ignoreDuplicates: true }
        );
      
      if (error && !error.message.includes('duplicate key')) {
        console.error(`Error syncing source ${source}:`, error);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error syncing sources to database:", error);
    return { success: false, error };
  }
}

export async function getLeadsStats(market: string = 'IT') {
  try {
    const [totalResult, assignableResult, assignedResult, bookedResult]: any[] = await Promise.all([
      supabase.from('lead_generation').select('id', { count: 'exact', head: true })
        .eq('market', market),
      supabase.from('lead_generation').select('id', { count: 'exact', head: true })
        .eq('market', market)
        .eq('assignable', true)
        .is('venditore', null)
        .eq('booked_call', 'NO')
        .eq('manually_not_assignable', false),
      supabase.from('lead_generation').select('id', { count: 'exact', head: true })
        .eq('market', market)
        .not('venditore', 'is', null),
      supabase.from('booked_call').select('id', { count: 'exact', head: true })
        .eq('market', market)
    ]);

    return {
      total: totalResult.count || 0,
      assignable: assignableResult.count || 0,
      assigned: assignedResult.count || 0,
      booked: bookedResult.count || 0
    };
  } catch (error) {
    console.error('Error fetching leads stats:', error);
    return {
      total: 0,
      assignable: 0,
      assigned: 0,
      booked: 0
    };
  }
}

// Alias for compatibility with Reports page
export const getTableCounts = getLeadsStats;

export async function getVendorStats(market: string = 'IT') {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .select('venditore')
      .eq('market', market) // Filter by market
      .not('venditore', 'is', null);
    
    if (error) throw error;
    
    // Count leads per vendor
    const vendorCounts: Record<string, number> = {};
    data?.forEach(lead => {
      if (lead.venditore) {
        vendorCounts[lead.venditore] = (vendorCounts[lead.venditore] || 0) + 1;
      }
    });
    
    // Convert to array format for charts
    return Object.entries(vendorCounts).map(([name, value]) => ({
      name,
      value
    }));
  } catch (error) {
    console.error('Error fetching vendor stats:', error);
    return [];
  }
}

// Legacy function for compatibility - Updated to use new states
export async function markLeadsAsAssigned(
  numLead: number, 
  venditore: string, 
  campagna?: string, 
  webhookUrl?: string,
  market: string = 'IT'
) {
  try {
    // Get available leads - CRITICO: Solo lead senza call prenotate
    const { data: availableLeads, error: fetchError }: { data: any[] | null; error: any } = await supabase
      .from('lead_generation')
      .select('*')
      .eq('market', market) // Filter by market
      .eq('assignable', true)
      .is('venditore', null)
      .eq('booked_call', 'NO') // CRITICO: Solo lead senza call prenotate
      .eq('manually_not_assignable', false) // Escludi lead marcati manualmente come non assegnabili
      .order('created_at', { ascending: true })
      .limit(numLead);

    if (fetchError) throw fetchError;
    
    if (!availableLeads || availableLeads.length === 0) {
      throw new Error('Nessun lead disponibile per l\'assegnazione');
    }

    const leadIds = availableLeads.map(lead => lead.id);

    // Update the leads - use only 'assegnato' state
    const { error: updateError } = await supabase
      .from('lead_generation')
      .update({ 
        venditore,
        campagna: campagna || null,
        stato: 'assegnato',
        assignable: false
      })
      .in('id', leadIds);

    if (updateError) throw updateError;

    return availableLeads;
  } catch (error) {
    console.error('Error marking leads as assigned:', error);
    throw error;
  }
}

// Nuova funzione per rendere un lead assegnabile rimuovendo il venditore
export async function makeLeadAssignable(leadId: string) {
  try {
    console.log(`Making lead ${leadId} assignable and removing vendor...`);
    
    const { error } = await supabase
      .from('lead_generation')
      .update({ 
        assignable: true,
        venditore: null, // Rimuove il venditore
        stato: 'nuovo',  // Reimposta lo stato a nuovo
        data_assegnazione: null // Rimuove anche la data di assegnazione
      })
      .eq('id', leadId);

    if (error) {
      console.error('Error making lead assignable:', error);
      throw error;
    }

    console.log(`Lead ${leadId} successfully made assignable and vendor removed`);
    return { success: true };
  } catch (error) {
    console.error('Error in makeLeadAssignable:', error);
    throw error;
  }
}