import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";
import { LeadLavorato } from "@/types/leadLavorato";

// Utility per calcolare offset italiano (gestisce CET/CEST automaticamente)
function getItalianTimezoneOffset(date: Date): string {
  const formatter = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    timeZoneName: 'shortOffset'
  });
  const parts = formatter.formatToParts(date);
  const offsetPart = parts.find(p => p.type === 'timeZoneName');
  if (offsetPart?.value) {
    const match = offsetPart.value.match(/GMT([+-])(\d+)/);
    if (match) {
      return `${match[1]}${match[2].padStart(2, '0')}:00`;
    }
  }
  return '+01:00'; // fallback CET
}

function getStartOfDayIT(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const tempDate = new Date(year, month - 1, day, 12, 0, 0);
  const offset = getItalianTimezoneOffset(tempDate);
  return new Date(`${dateString}T00:00:00${offset}`).toISOString();
}

function getEndOfDayIT(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const tempDate = new Date(year, month - 1, day, 12, 0, 0);
  const offset = getItalianTimezoneOffset(tempDate);
  return new Date(`${dateString}T23:59:59.999${offset}`).toISOString();
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
        query = query.lte('created_at', getEndOfDayIT(filters.dataFine));
      }

      // Filtri per fonte avanzati (usa ultima_fonte per coerenza con i report)
      if (filters.fontiIncluse && filters.fontiIncluse.length > 0) {
        console.log('Applying include fonte filter:', filters.fontiIncluse);
        const conditions = filters.fontiIncluse.map((fonte: string) => `ultima_fonte.ilike.%${fonte}%`).join(',');
        query = query.or(conditions);
      }
      
      if (filters.fontiEscluse && filters.fontiEscluse.length > 0) {
        console.log('Applying exclude fonte filter:', filters.fontiEscluse);
        filters.fontiEscluse.forEach((fonte: string) => {
          query = query.not('ultima_fonte', 'ilike', `%${fonte}%`);
        });
      }

      // Filtro vendite chiuse
      if (filters.venditaChiusa === true) {
        query = query.eq('vendita_chiusa', true);
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

export async function filterLeads(tableName: ValidTableName, filters: Record<string, any>, market: string = 'IT') {
  console.log(`Filtering ${tableName} with filters:`, filters);
  
  let query: any = supabase.from(tableName).select('*');
  
  // Apply market filter for relevant tables
  if (['lead_generation', 'booked_call', 'venditori', 'lead_lavorati'].includes(tableName)) {
    if (market === 'IT') {
      query = query.or('market.eq.IT,market.is.null');
    } else {
      query = query.eq('market', market);
    }
  }
  
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
    query = query.lte('created_at', getEndOfDayIT(filters.dataFine));
  }

  // Filtri per fonte avanzati (usa ultima_fonte per coerenza con i report)
  if (filters.fontiIncluse && filters.fontiIncluse.length > 0) {
    console.log('Applying include fonte filter:', filters.fontiIncluse);
    const conditions = filters.fontiIncluse.map((fonte: string) => `ultima_fonte.ilike.%${fonte}%`).join(',');
    query = query.or(conditions);
  }
  
  if (filters.fontiEscluse && filters.fontiEscluse.length > 0) {
    console.log('Applying exclude fonte filter:', filters.fontiEscluse);
    filters.fontiEscluse.forEach((fonte: string) => {
      query = query.not('ultima_fonte', 'ilike', `%${fonte}%`);
    });
  }
  
  // Ordina per data di creazione
  query = query.order('created_at', { ascending: false });
  
  const { data, error } = await query;
  
  if (error) {
    console.error(`Error filtering ${tableName}:`, error);
    throw error;
  }
  
  console.log(`Filtered ${tableName} (market: ${market}) results:`, data?.length);
  return data;
}

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

export async function getUniqueSourcesFromLeads(market: string = 'IT'): Promise<string[]> {
  try {
    console.log(`🔍 getUniqueSourcesFromLeads: Fetching for market "${market}"`);

    // Fetch ALL rows in chunks to avoid the 1000-rows default cap
    const pageSize = 1000;
    const maxRows = 50000; // safety cap
    let from = 0;
    const allRows: any[] = [];

    while (from < maxRows) {
      let query = supabase
        .from('lead_generation')
        .select('fonte, ultima_fonte, market, created_at')
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);

      // Include legacy records without market to avoid missing sources
      if (market) {
        query = query.or(`market.eq.${market},market.is.null`);
      }

      const { data, error }: { data: any[] | null; error: any } = await query;
      if (error) {
        console.error("❌ Error in getUniqueSourcesFromLeads query:", error);
        throw error;
      }

      const chunk = data || [];
      allRows.push(...chunk);
      console.log(`📥 Fetched chunk: ${chunk.length} rows (from ${from})`);

      if (chunk.length < pageSize) break; // last page reached
      from += pageSize;
    }

    console.log(`📊 Retrieved ${allRows.length} lead records for market ${market}`);

    // Helper to extract tokens from CSV or JSON array formats and sanitize them
    const allTokens: string[] = [];
    const addTokens = (raw?: string, _fieldName?: string) => {
      if (!raw) return;
      const val = String(raw).trim();
      if (!val) return;

      let tokens: string[] = [];
      // Try parsing as JSON array first
      if ((val.startsWith('[') && val.endsWith(']')) || val.includes('\",\"')) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            tokens = parsed.map((v) => String(v));
          }
        } catch {
          // Fallback to delimiter-based split below
        }
      }

      if (tokens.length === 0) {
        tokens = val.split(/[\,\|;]+/).map(t => t.trim()).filter(Boolean);
      }

      for (let t of tokens) {
        // Remove stray quotes/brackets (including typographic quotes) and trim
        let s = t.replace(/^[\"'“”‘’\[\]]+|[\"'“”‘’\[\]]+$/g, '').trim();
        if (!s) continue;
        const normalized = s.toLowerCase();
        // Ignore generic placeholders
        if (["no", "si", "false", "true", "null", "undefined", "-"].includes(normalized)) continue;
        allTokens.push(s);
      }
    };

    allRows.forEach(item => {
      addTokens(item.fonte, 'fonte');
      addTokens(item.ultima_fonte, 'ultima_fonte');
    });

    console.log(`📋 Total tokens extracted: ${allTokens.length}`);

    // Dedupe case-insensitively while preserving first-seen casing
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const s of allTokens) {
      const k = s.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        unique.push(s);
      }
    }

    const sorted = unique.sort((a, b) => a.localeCompare(b));
    console.log(`✅ getUniqueSourcesFromLeads: Returning ${sorted.length} unique sources for market ${market}`);
    console.log(`📝 Sample sources (first 10):`, sorted.slice(0, 10));

    return sorted;
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