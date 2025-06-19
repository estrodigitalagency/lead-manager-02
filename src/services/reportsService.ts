
import { supabase } from "@/integrations/supabase/client";

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  fonte?: string;
  venditore?: string;
  fontiIncluse?: string[];
  fontiEscluse?: string[];
  sourceMode?: 'include' | 'exclude';
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

// Helper function to convert date to start of day
function getStartOfDay(dateString: string): string {
  return `${dateString}T00:00:00.000Z`;
}

// Helper function to convert date to end of day
function getEndOfDay(dateString: string): string {
  return `${dateString}T23:59:59.999Z`;
}

// Helper function to apply fonte filters
function applyFonteFilters(query: any, filters: ReportFilters) {
  // Se c'è un filtro fonte specifico, ignorare i filtri di inclusione/esclusione
  if (filters.fonte && typeof filters.fonte === 'string' && filters.fonte.trim() !== '') {
    const cleanFonte = filters.fonte.trim();
    console.log('Applying specific fonte filter:', cleanFonte);
    return query.or(`fonte.ilike.%${cleanFonte}%,fonte.ilike.% ${cleanFonte}%,fonte.ilike.%${cleanFonte} %`);
  }

  // Applicare filtri di inclusione/esclusione
  if (filters.sourceMode === 'include' && filters.fontiIncluse && filters.fontiIncluse.length > 0) {
    console.log('Applying include filters:', filters.fontiIncluse);
    const includeConditions = filters.fontiIncluse.map(fonte => 
      `fonte.ilike.%${fonte}%`
    ).join(',');
    return query.or(includeConditions);
  }

  if (filters.sourceMode === 'exclude' && filters.fontiEscluse && filters.fontiEscluse.length > 0) {
    console.log('Applying exclude filters:', filters.fontiEscluse);
    filters.fontiEscluse.forEach(fonte => {
      query = query.not('fonte', 'ilike', `%${fonte}%`);
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
  
  let query = supabase
    .from('booked_call')
    .select('id', { count: 'exact', head: true });

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

  // Applicare filtri fonte
  query = applyFonteFilters(query, filters);

  // Filtro per venditore - usa pattern matching con trim degli spazi
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

export async function getAvailableFonti(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .select('fonte')
      .not('fonte', 'is', null)
      .not('fonte', 'eq', '');

    if (error) throw error;

    // Estrai e flatta tutte le fonti
    const allFonti = new Set<string>();
    data?.forEach(item => {
      if (item.fonte) {
        item.fonte.split(',').forEach((fonte: string) => {
          const trimmedFonte = fonte.trim();
          if (trimmedFonte) {
            allFonti.add(trimmedFonte);
          }
        });
      }
    });

    return Array.from(allFonti).sort();
  } catch (error) {
    console.error('Error fetching available fonti:', error);
    return [];
  }
}

export async function getAvailableVenditori(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .select('venditore')
      .not('venditore', 'is', null)
      .not('venditore', 'eq', '');

    if (error) throw error;

    const uniqueVenditori = [...new Set(data?.map(item => item.venditore).filter(Boolean))];
    return uniqueVenditori.sort();
  } catch (error) {
    console.error('Error fetching available venditori:', error);
    return [];
  }
}

// Periodi predefiniti
export const PRESET_PERIODS = {
  today: {
    label: 'Oggi',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  },
  yesterday: {
    label: 'Ieri',
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  last7days: {
    label: 'Ultimi 7 giorni',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  },
  last30days: {
    label: 'Ultimi 30 giorni',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  },
  thisMonth: {
    label: 'Questo mese',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  },
  lastMonth: {
    label: 'Mese scorso',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0]
  }
};
