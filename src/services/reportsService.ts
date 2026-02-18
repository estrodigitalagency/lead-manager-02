
import { supabase } from "@/integrations/supabase/client";

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  fonte?: string;
  venditore?: string;
  fontiIncluse?: string[];
  fontiEscluse?: string[];
  sourceMode?: 'include' | 'exclude';
  market?: 'IT' | 'ES';
}

export interface ReportMetrics {
  leadTotaliGenerati: number;
  callTotaliPrenotate: number;
  leadTotaliLavorati: number;
}

export async function getReportMetrics(filters: ReportFilters): Promise<ReportMetrics> {
  try {
    console.log('Report filters:', filters);
    
    const promises = [
      getLeadTotaliGenerati(filters),
      getCallTotaliPrenotate(filters),
      getLeadTotaliLavorati(filters)
    ];

    const [leadTotaliGenerati, callTotaliPrenotate, leadTotaliLavorati] = await Promise.all(promises);

    console.log('Report metrics results:', {
      leadTotaliGenerati,
      callTotaliPrenotate,
      leadTotaliLavorati
    });

    return {
      leadTotaliGenerati,
      callTotaliPrenotate,
      leadTotaliLavorati
    };
  } catch (error) {
    console.error('Error fetching report metrics:', error);
    return {
      leadTotaliGenerati: 0,
      callTotaliPrenotate: 0,
      leadTotaliLavorati: 0
    };
  }
}

// Helper function to get Italian timezone offset dynamically (handles DST)
function getItalianTimezoneOffset(date: Date): string {
  // Create a formatter for Italian timezone to detect the offset
  const formatter = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    timeZoneName: 'shortOffset'
  });
  
  const parts = formatter.formatToParts(date);
  const offsetPart = parts.find(p => p.type === 'timeZoneName');
  
  // Parse offset like "GMT+1" or "GMT+2"
  if (offsetPart?.value) {
    const match = offsetPart.value.match(/GMT([+-])(\d+)/);
    if (match) {
      const sign = match[1];
      const hours = match[2].padStart(2, '0');
      return `${sign}${hours}:00`;
    }
  }
  
  // Fallback: calculate offset manually
  const testDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const diffHours = Math.round((testDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60));
  const sign = diffHours >= 0 ? '+' : '-';
  return `${sign}${Math.abs(diffHours).toString().padStart(2, '0')}:00`;
}

// Helper function to convert date to start of day in Italian timezone
function getStartOfDay(dateString: string): string {
  // Parse the date string and determine the correct offset for that specific date
  const [year, month, day] = dateString.split('-').map(Number);
  const tempDate = new Date(year, month - 1, day, 12, 0, 0); // Use noon to avoid DST edge cases
  const offset = getItalianTimezoneOffset(tempDate);
  
  // Create date at midnight in Italy with the correct offset
  const date = new Date(`${dateString}T00:00:00${offset}`);
  return date.toISOString();
}

// Helper function to convert date to end of day in Italian timezone
function getEndOfDay(dateString: string): string {
  // Parse the date string and determine the correct offset for that specific date
  const [year, month, day] = dateString.split('-').map(Number);
  const tempDate = new Date(year, month - 1, day, 12, 0, 0); // Use noon to avoid DST edge cases
  const offset = getItalianTimezoneOffset(tempDate);
  
  // Create date at 23:59:59 in Italy with the correct offset
  const date = new Date(`${dateString}T23:59:59.999${offset}`);
  return date.toISOString();
}

// Helper function to apply fonte filters
function applyFonteFilters(query: any, filters: ReportFilters, fonteColumn: string = 'ultima_fonte') {
  // Se c'è un filtro fonte specifico, ignorare i filtri di inclusione/esclusione
  if (filters.fonte && typeof filters.fonte === 'string' && filters.fonte.trim() !== '') {
    const cleanFonte = filters.fonte.trim();
    console.log('Applying specific fonte filter:', cleanFonte, 'on column:', fonteColumn);
    return query.or(`${fonteColumn}.ilike.%${cleanFonte}%,${fonteColumn}.ilike.% ${cleanFonte}%,${fonteColumn}.ilike.%${cleanFonte} %`);
  }

  // Applicare filtri di inclusione/esclusione
  if (filters.sourceMode === 'include' && filters.fontiIncluse && filters.fontiIncluse.length > 0) {
    console.log('Applying include filters:', filters.fontiIncluse, 'on column:', fonteColumn);
    const includeConditions = filters.fontiIncluse.map(fonte => 
      `${fonteColumn}.eq.${fonte}`
    ).join(',');
    return query.or(includeConditions);
  }

  if (filters.sourceMode === 'exclude' && filters.fontiEscluse && filters.fontiEscluse.length > 0) {
    console.log('Applying exclude filters:', filters.fontiEscluse, 'on column:', fonteColumn);
    filters.fontiEscluse.forEach(fonte => {
      query = query.not(fonteColumn, 'eq', fonte);
    });
    return query;
  }

  return query;
}

async function getLeadTotaliGenerati(filters: ReportFilters): Promise<number> {
  console.log('Getting lead totali generati with filters:', filters);
  
  let query = supabase
    .from('lead_generation')
    .select('id', { count: 'exact', head: true });

  // Filter by market
  if (filters.market) {
    query = query.eq('market', filters.market);
  }

  // Filtro per data di creazione
  if (filters.startDate) {
    const startDateTime = getStartOfDay(filters.startDate);
    console.log('Lead generati - filtering by start date:', startDateTime);
    query = query.gte('created_at', startDateTime);
  }
  if (filters.endDate) {
    const endDateTime = getEndOfDay(filters.endDate);
    console.log('Lead generati - filtering by end date:', endDateTime);
    query = query.lte('created_at', endDateTime);
  }

  // Applicare filtri fonte
  query = applyFonteFilters(query, filters);

  // Filtro per venditore - usa pattern matching con trim degli spazi
  if (filters.venditore && typeof filters.venditore === 'string' && filters.venditore.trim() !== '') {
    const cleanVenditore = filters.venditore.trim();
    console.log('Lead generati - filtering by venditore:', cleanVenditore);
    query = query.or(`venditore.eq.${cleanVenditore},venditore.eq. ${cleanVenditore},venditore.eq.${cleanVenditore} `);
  }

  const { count, error } = await query;
  
  console.log('Lead generati query result:', { count, error });
  
  if (error) {
    console.error('Error fetching lead totali generati:', error);
    return 0;
  }

  return count || 0;
}

async function getCallTotaliPrenotate(filters: ReportFilters): Promise<number> {
  console.log('Getting call totali prenotate with filters:', filters);
  
  // Conta i lead in lead_generation con booked_call = 'SI'
  let query = supabase
    .from('lead_generation')
    .select('id', { count: 'exact', head: true })
    .in('booked_call', ['SI', 'Si', 'si', 'Sì']);

  // Filter by market
  if (filters.market) {
    query = query.eq('market', filters.market);
  }

  // Filtro per data di creazione
  if (filters.startDate) {
    const startDateTime = getStartOfDay(filters.startDate);
    console.log('Call prenotate - filtering by start date:', startDateTime);
    query = query.gte('created_at', startDateTime);
  }
  if (filters.endDate) {
    const endDateTime = getEndOfDay(filters.endDate);
    console.log('Call prenotate - filtering by end date:', endDateTime);
    query = query.lte('created_at', endDateTime);
  }

  // Applicare filtri fonte (usa ultima_fonte come lead_generation)
  query = applyFonteFilters(query, filters);

  // Filtro per venditore
  if (filters.venditore && typeof filters.venditore === 'string' && filters.venditore.trim() !== '') {
    const cleanVenditore = filters.venditore.trim();
    console.log('Call prenotate - filtering by venditore:', cleanVenditore);
    query = query.or(`venditore.eq.${cleanVenditore},venditore.eq. ${cleanVenditore},venditore.eq.${cleanVenditore} `);
  }

  const { count, error } = await query;
  
  console.log('Call prenotate query result:', { count, error });
  
  if (error) {
    console.error('Error fetching call totali prenotate:', error);
    return 0;
  }

  return count || 0;
}

async function getLeadTotaliLavorati(filters: ReportFilters): Promise<number> {
  console.log('Getting lead totali lavorati with filters:', filters);
  
  let query = supabase
    .from('lead_generation')
    .select('id', { count: 'exact', head: true })
    .not('data_assegnazione', 'is', null);

  // Filter by market
  if (filters.market) {
    query = query.eq('market', filters.market);
  }

  // IMPORTANTE: Filtro per data di ASSEGNAZIONE, non di creazione
  if (filters.startDate) {
    const startDateTime = getStartOfDay(filters.startDate);
    console.log('Lead lavorati - filtering by data_assegnazione start date:', startDateTime);
    query = query.gte('data_assegnazione', startDateTime);
  }
  if (filters.endDate) {
    const endDateTime = getEndOfDay(filters.endDate);
    console.log('Lead lavorati - filtering by data_assegnazione end date:', endDateTime);
    query = query.lte('data_assegnazione', endDateTime);
  }

  // Applicare filtri fonte
  query = applyFonteFilters(query, filters);

  // Filtro per venditore - usa pattern matching con trim degli spazi
  if (filters.venditore && typeof filters.venditore === 'string' && filters.venditore.trim() !== '') {
    const cleanVenditore = filters.venditore.trim();
    console.log('Lead lavorati - filtering by venditore:', cleanVenditore);
    query = query.or(`venditore.eq.${cleanVenditore},venditore.eq. ${cleanVenditore},venditore.eq.${cleanVenditore} `);
  }

  const { count, error } = await query;
  
  console.log('Lead lavorati query result:', { count, error });
  
  if (error) {
    console.error('Error fetching lead totali lavorati:', error);
    return 0;
  }

  return count || 0;
}

export async function getAvailableFonti(market?: 'IT' | 'ES'): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('database_fonti')
      .select('nome')
      .eq('attivo', true)
      .order('nome');

    if (error) throw error;

    return (data || []).map(item => item.nome).filter(Boolean);
  } catch (error) {
    console.error('Error fetching available fonti:', error);
    return [];
  }
}

export interface LeadsBySourceItem {
  fonte: string;
  count: number;
  percentage: number;
}

export async function getLeadsBySource(
  market: 'IT' | 'ES',
  startDate?: string,
  endDate?: string,
  sourceMode?: 'include' | 'exclude',
  fontiIncluse?: string[],
  fontiEscluse?: string[]
): Promise<LeadsBySourceItem[]> {
  try {
    const allFonti: string[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('lead_generation')
        .select('ultima_fonte')
        .eq('market', market)
        .not('ultima_fonte', 'is', null)
        .not('ultima_fonte', 'eq', '');

      if (startDate) {
        query = query.gte('created_at', getStartOfDay(startDate));
      }
      if (endDate) {
        query = query.lte('created_at', getEndOfDay(endDate));
      }

      // Apply source filters
      if (sourceMode === 'include' && fontiIncluse && fontiIncluse.length > 0) {
        const includeConditions = fontiIncluse.map(fonte => 
          `ultima_fonte.eq.${fonte}`
        ).join(',');
        query = query.or(includeConditions);
      }
      if (sourceMode === 'exclude' && fontiEscluse && fontiEscluse.length > 0) {
        fontiEscluse.forEach(fonte => {
          query = query.not('ultima_fonte', 'eq', fonte);
        });
      }

      query = query.range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        data.forEach(item => {
          if (item.ultima_fonte) allFonti.push(item.ultima_fonte.trim());
        });
      }

      hasMore = (data?.length || 0) === pageSize;
      page++;
    }

    // Aggregate
    const counts: Record<string, number> = {};
    allFonti.forEach(fonte => {
      counts[fonte] = (counts[fonte] || 0) + 1;
    });

    const total = allFonti.length;
    const result: LeadsBySourceItem[] = Object.entries(counts)
      .map(([fonte, count]) => ({
        fonte,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.count - a.count);

    return result;
  } catch (error) {
    console.error('Error fetching leads by source:', error);
    return [];
  }
}

export async function getAvailableVenditori(market?: 'IT' | 'ES'): Promise<string[]> {
  try {
    let query = supabase
      .from('lead_generation')
      .select('venditore')
      .not('venditore', 'is', null)
      .not('venditore', 'eq', '');
    
    if (market) {
      query = query.eq('market', market);
    }
    
    const { data, error } = await query;

    if (error) throw error;

    const uniqueVenditori = [...new Set(data?.map(item => item.venditore).filter(Boolean))];
    return uniqueVenditori.sort();
  } catch (error) {
    console.error('Error fetching available venditori:', error);
    return [];
  }
}

// Helper function to get today's date in Italian timezone
function getItalianDate(daysOffset: number = 0): string {
  const now = new Date();
  now.setDate(now.getDate() + daysOffset);
  return now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' }); // sv-SE gives YYYY-MM-DD format
}

// Helper function to get first day of month in Italian timezone
function getItalianMonthStart(monthOffset: number = 0): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + monthOffset;
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
}

// Helper function to get last day of month in Italian timezone  
function getItalianMonthEnd(monthOffset: number = 0): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + monthOffset + 1; // Next month
  const date = new Date(year, month, 0); // Day 0 = last day of previous month
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
}

// Periodi predefiniti - calcolati dinamicamente nel fuso orario italiano
export const PRESET_PERIODS = {
  today: {
    label: 'Oggi',
    get startDate() { return getItalianDate(0); },
    get endDate() { return getItalianDate(0); }
  },
  yesterday: {
    label: 'Ieri',
    get startDate() { return getItalianDate(-1); },
    get endDate() { return getItalianDate(-1); }
  },
  last7days: {
    label: 'Ultimi 7 giorni',
    get startDate() { return getItalianDate(-6); },
    get endDate() { return getItalianDate(0); }
  },
  last30days: {
    label: 'Ultimi 30 giorni',
    get startDate() { return getItalianDate(-29); },
    get endDate() { return getItalianDate(0); }
  },
  thisMonth: {
    label: 'Questo mese',
    get startDate() { return getItalianMonthStart(0); },
    get endDate() { return getItalianDate(0); }
  },
  lastMonth: {
    label: 'Mese scorso',
    get startDate() { return getItalianMonthStart(-1); },
    get endDate() { return getItalianMonthEnd(-1); }
  }
};
