
import { supabase } from "@/integrations/supabase/client";
import { expandCampagnaToFilters } from "@/services/databaseService";

// Cache for fonte mapping
let fonteMappingCache: { leadToCalendario: Map<string, string>; calendarioToLead: Map<string, string> } | null = null;
let fonteMappingCacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

async function getFonteMapping() {
  const now = Date.now();
  if (fonteMappingCache && (now - fonteMappingCacheTime) < CACHE_TTL) {
    return fonteMappingCache;
  }

  const { data, error } = await supabase
    .from('fonte_mapping')
    .select('fonte_lead, fonte_calendario');

  const leadToCalendario = new Map<string, string>();
  const calendarioToLead = new Map<string, string>();

  if (!error && data) {
    (data as { fonte_lead: string; fonte_calendario: string }[]).forEach(m => {
      leadToCalendario.set(m.fonte_lead.toLowerCase(), m.fonte_calendario);
      calendarioToLead.set(m.fonte_calendario.toLowerCase(), m.fonte_lead);
    });
  }

  fonteMappingCache = { leadToCalendario, calendarioToLead };
  fonteMappingCacheTime = now;
  return fonteMappingCache;
}

// Translate fonte lead names to their calendario equivalents for booked_call queries
function translateFontiForCalendario(fonti: string[], mapping: Map<string, string>): string[] {
  const result: string[] = [];
  for (const fonte of fonti) {
    const mapped = mapping.get(fonte.toLowerCase());
    result.push(mapped || fonte); // Use mapped name if exists, otherwise use original
  }
  return result;
}

function translateSingleFonteForCalendario(fonte: string, mapping: Map<string, string>): string {
  return mapping.get(fonte.toLowerCase()) || fonte;
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  fonte?: string;
  venditore?: string;
  campagna?: string;
  fontiIncluse?: string[];
  fontiEscluse?: string[];
  sourceMode?: 'include' | 'exclude';
  market?: 'IT' | 'ES';
  callAttributionMode?: 'ultima_fonte' | 'fonte_calendario';
}

export interface ReportMetrics {
  leadTotaliGenerati: number;
  callTotaliPrenotate: number;
  leadTotaliLavorati: number;
}

export async function getReportMetrics(filters: ReportFilters): Promise<ReportMetrics> {
  try {
    console.log('Report filters:', filters);
    // Espande filtro campagna in fonti incluse/escluse secondo config campagna
    const expanded = (await expandCampagnaToFilters(filters as any, filters.market || 'IT')) as ReportFilters;

    const promises = [
      getLeadTotaliGenerati(expanded),
      getCallTotaliPrenotate(expanded),
      getLeadTotaliLavorati(expanded)
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

// Compute the UTC instant corresponding to a wall-clock moment in Europe/Rome.
// Iterative method is robust across DST transitions and all browser timezones.
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

function getStartOfDay(dateString: string): string {
  return romeWallClockToUTC(dateString, '00:00:00').toISOString();
}

// Exclusive upper bound: start of the NEXT day in Rome.
// Use with .lt() instead of .lte() to avoid timestamp precision edge cases.
function getNextDayStart(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDateString = next.toISOString().slice(0, 10);
  return getStartOfDay(nextDateString);
}


// Applica filtro campagna (ilike wildcard) solo se NON e' gia' stata espansa in filtri fonte
function applyCampagnaFilter(query: any, filters: ReportFilters & { __campagnaExpanded?: boolean }) {
  if (filters.__campagnaExpanded) return query;
  if (filters.campagna && typeof filters.campagna === 'string' && filters.campagna.trim() !== '') {
    return query.ilike('campagna', `%${filters.campagna.trim()}%`);
  }
  return query;
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
      `${fonteColumn}.ilike.${fonte}`
    ).join(',');
    return query.or(includeConditions);
  }

  if (filters.sourceMode === 'exclude' && filters.fontiEscluse && filters.fontiEscluse.length > 0) {
    console.log('Applying exclude filters:', filters.fontiEscluse, 'on column:', fonteColumn);
    filters.fontiEscluse.forEach(fonte => {
      query = query.not(fonteColumn, 'ilike', fonte);
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

  // Filtro per data di creazione (bound esclusivo su next-day-start per evitare edge di precisione)
  if (filters.startDate) {
    const startDateTime = getStartOfDay(filters.startDate);
    console.log('Lead generati - start >=', startDateTime);
    query = query.gte('created_at', startDateTime);
  }
  if (filters.endDate) {
    const nextDayStart = getNextDayStart(filters.endDate);
    console.log('Lead generati - end <', nextDayStart);
    query = query.lt('created_at', nextDayStart);
  }

  // Applicare filtri fonte
  query = applyFonteFilters(query, filters);
  query = applyCampagnaFilter(query, filters);

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
  
  // Modalità fonte calendario: query sulla tabella booked_call
  if (filters.callAttributionMode === 'fonte_calendario') {
    return getCallTotaliPrenotateFonteCalendario(filters);
  }
  
  // Modalità default (ultima_fonte): comportamento attuale
  let query = supabase
    .from('lead_generation')
    .select('id', { count: 'exact', head: true })
    .in('booked_call', ['SI', 'Si', 'si', 'Sì']);

  if (filters.market) {
    query = query.eq('market', filters.market);
  }

  if (filters.startDate) {
    query = query.gte('created_at', getStartOfDay(filters.startDate));
  }
  if (filters.endDate) {
    query = query.lt('created_at', getNextDayStart(filters.endDate));
  }

  query = applyFonteFilters(query, filters);
  query = applyCampagnaFilter(query, filters);

  if (filters.venditore && typeof filters.venditore === 'string' && filters.venditore.trim() !== '') {
    const cleanVenditore = filters.venditore.trim();
    query = query.or(`venditore.eq.${cleanVenditore},venditore.eq. ${cleanVenditore},venditore.eq.${cleanVenditore} `);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error fetching call totali prenotate:', error);
    return 0;
  }

  return count || 0;
}

async function getCallTotaliPrenotateFonteCalendario(filters: ReportFilters): Promise<number> {
  console.log('Getting call prenotate by fonte_calendario with filters:', filters);

  const mapping = await getFonteMapping();

  let query = supabase
    .from('booked_call')
    .select('id', { count: 'exact', head: true });

  if (filters.market) {
    query = query.eq('market', filters.market);
  }

  if (filters.startDate) {
    query = query.gte('created_at', getStartOfDay(filters.startDate));
  }
  if (filters.endDate) {
    query = query.lt('created_at', getNextDayStart(filters.endDate));
  }

  // Translate fonte filters using mapping before applying
  const translatedFilters = { ...filters };
  if (translatedFilters.fonte) {
    translatedFilters.fonte = translateSingleFonteForCalendario(translatedFilters.fonte, mapping.leadToCalendario);
  }
  if (translatedFilters.fontiIncluse) {
    translatedFilters.fontiIncluse = translateFontiForCalendario(translatedFilters.fontiIncluse, mapping.leadToCalendario);
  }
  if (translatedFilters.fontiEscluse) {
    translatedFilters.fontiEscluse = translateFontiForCalendario(translatedFilters.fontiEscluse, mapping.leadToCalendario);
  }

  query = applyFonteFilters(query, translatedFilters, 'fonte');
  query = applyCampagnaFilter(query, filters);

  if (filters.venditore && typeof filters.venditore === 'string' && filters.venditore.trim() !== '') {
    const cleanVenditore = filters.venditore.trim();
    query = query.or(`venditore.eq.${cleanVenditore},venditore.eq. ${cleanVenditore},venditore.eq.${cleanVenditore} `);
  }

  const { count, error } = await query;
  
  if (error) {
    console.error('Error fetching call prenotate by fonte_calendario:', error);
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
    console.log('Lead lavorati - data_assegnazione >=', startDateTime);
    query = query.gte('data_assegnazione', startDateTime);
  }
  if (filters.endDate) {
    const nextDayStart = getNextDayStart(filters.endDate);
    console.log('Lead lavorati - data_assegnazione <', nextDayStart);
    query = query.lt('data_assegnazione', nextDayStart);
  }

  // Applicare filtri fonte
  query = applyFonteFilters(query, filters);
  query = applyCampagnaFilter(query, filters);

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
  fontiEscluse?: string[],
  campagna?: string
): Promise<LeadsBySourceItem[]> {
  try {
    // Espande campagna in fonti incluse/escluse (se non ci sono filtri fonte manuali)
    let campagnaExpanded = false;
    if (campagna && campagna.trim() !== '') {
      const hasManualSourceFilter = (fontiIncluse?.length ?? 0) > 0 || (fontiEscluse?.length ?? 0) > 0;
      if (!hasManualSourceFilter) {
        const expanded = (await expandCampagnaToFilters({ campagna } as any, market)) as any;
        if (expanded?.__campagnaExpanded) {
          fontiIncluse = expanded.fontiIncluse;
          fontiEscluse = expanded.fontiEscluse;
          sourceMode = fontiIncluse?.length ? 'include' : 'exclude';
          campagnaExpanded = true;
        }
      }
    }
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
        query = query.lt('created_at', getNextDayStart(endDate));
      }

      if (campagna && campagna.trim() !== '' && !campagnaExpanded) {
        query = query.ilike('campagna', `%${campagna.trim()}%`);
      }

      // Apply source filters
      if (sourceMode === 'include' && fontiIncluse && fontiIncluse.length > 0) {
        const includeConditions = fontiIncluse.map(fonte =>
          `ultima_fonte.ilike.${fonte}`
        ).join(',');
        query = query.or(includeConditions);
      }
      if (sourceMode === 'exclude' && fontiEscluse && fontiEscluse.length > 0) {
        fontiEscluse.forEach(fonte => {
          query = query.not('ultima_fonte', 'ilike', fonte);
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

export interface ReportLeadDetail {
  id: string;
  created_at: string | null;
  nome: string;
  cognome: string | null;
  email: string | null;
  telefono: string | null;
  ultima_fonte: string | null;
  booked_call: string | null;
  venditore: string | null;
  stato_del_lead: string | null;
  data_assegnazione: string | null;
  fonte_calendario?: string | null;
}

export async function getFilteredLeads(filters: ReportFilters): Promise<ReportLeadDetail[]> {
  try {
    // Espande filtro campagna in fonti incluse/escluse
    filters = (await expandCampagnaToFilters(filters as any, filters.market || 'IT')) as ReportFilters;
    const allLeads: ReportLeadDetail[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('lead_generation')
        .select('id, created_at, nome, cognome, email, telefono, ultima_fonte, booked_call, venditore, stato_del_lead, data_assegnazione');

      if (filters.market) {
        query = query.eq('market', filters.market);
      }
      if (filters.startDate) {
        query = query.gte('created_at', getStartOfDay(filters.startDate));
      }
      if (filters.endDate) {
        query = query.lt('created_at', getNextDayStart(filters.endDate));
      }

      query = applyFonteFilters(query, filters);
      query = applyCampagnaFilter(query, filters);

      if (filters.venditore && filters.venditore.trim() !== '') {
        const cleanVenditore = filters.venditore.trim();
        query = query.or(`venditore.eq.${cleanVenditore},venditore.eq. ${cleanVenditore},venditore.eq.${cleanVenditore} `);
      }

      query = query.order('created_at', { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        allLeads.push(...(data as ReportLeadDetail[]));
      }

      hasMore = (data?.length || 0) === pageSize;
      page++;
    }

    // Se modalità fonte_calendario, arricchisci con la fonte dalla tabella booked_call
    if (filters.callAttributionMode === 'fonte_calendario') {
      const leadIds = allLeads.filter(l => l.booked_call && ['si', 'sì'].includes(l.booked_call.toLowerCase())).map(l => l.id);
      
      if (leadIds.length > 0) {
        // Fetch booked_call data in batches
        const batchSize = 500;
        const bookedCallMap = new Map<string, string>();
        
        for (let i = 0; i < leadIds.length; i += batchSize) {
          const batch = leadIds.slice(i, i + batchSize);
          const { data: bookedData } = await supabase
            .from('booked_call')
            .select('lead_id, fonte')
            .in('lead_id', batch);
          
          if (bookedData) {
            bookedData.forEach(bc => {
              if (bc.lead_id && bc.fonte) {
                bookedCallMap.set(bc.lead_id, bc.fonte);
              }
            });
          }
        }

        // Enrich leads with fonte_calendario
        allLeads.forEach(lead => {
          lead.fonte_calendario = bookedCallMap.get(lead.id) || null;
        });
      }
    }

    return allLeads;
  } catch (error) {
    console.error('Error fetching filtered leads:', error);
    return [];
  }
}

export async function getAvailableVenditori(market?: 'IT' | 'ES'): Promise<string[]> {
  try {
    // Use venditori table instead of scanning all 44k+ leads
    let query = supabase
      .from('venditori')
      .select('nome, cognome')
      .eq('stato', 'attivo');
    
    if (market) {
      query = query.eq('market', market);
    }
    
    const { data, error } = await query;

    if (error) throw error;

    const venditori = (data || []).map(v => 
      `${v.nome}${v.cognome ? ' ' + v.cognome : ''}`.trim()
    ).filter(Boolean);
    return venditori.sort();
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
