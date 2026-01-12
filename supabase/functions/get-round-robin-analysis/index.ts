import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Lead {
  id: string;
  nome: string;
  cognome: string | null;
  email: string | null;
  telefono: string | null;
  fonte: string | null;
  created_at: string | null;
}

interface PreviousAssignment {
  venditore: string;
  data_assegnazione: string;
  ultima_fonte: string | null;
}

interface AnalyzedLead {
  id: string;
  nome: string;
  cognome: string | null;
  email: string | null;
  telefono: string | null;
  fonte_attuale: string | null;
  created_at: string | null;
  previous_venditore: string;
  previous_data_assegnazione: string;
  previous_ultima_fonte: string | null;
  giorni_da_assegnazione: number;
}

interface VenditoreGroup {
  venditore: string;
  count: number;
  oldestAssignment: string;
  newestAssignment: string;
  leads: AnalyzedLead[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { market = 'IT', minDaysAgo, maxDaysAgo, venditoreFilter } = await req.json();

    console.log('Analyzing Round Robin leads for market:', market);
    console.log('Filters - minDaysAgo:', minDaysAgo, 'maxDaysAgo:', maxDaysAgo, 'venditoreFilter:', venditoreFilter);

    // Get all Round Robin leads
    const { data: roundRobinLeads, error: rrError } = await supabase
      .from('lead_generation')
      .select('id, nome, cognome, email, telefono, fonte, created_at')
      .eq('venditore', 'Round Robin')
      .eq('market', market)
      .order('created_at', { ascending: false });

    if (rrError) {
      console.error('Error fetching Round Robin leads:', rrError);
      throw rrError;
    }

    console.log('Found', roundRobinLeads?.length || 0, 'Round Robin leads');

    const analyzedLeads: AnalyzedLead[] = [];
    const leadsWithoutPrevious: Lead[] = [];

    // For each lead, find previous assignment
    for (const lead of roundRobinLeads || []) {
      const previousAssignment = await findPreviousAssignment(supabase, lead, market);
      
      if (previousAssignment) {
        const assegnazionDate = new Date(previousAssignment.data_assegnazione);
        const now = new Date();
        const diffTime = now.getTime() - assegnazionDate.getTime();
        const giorniPassati = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Apply day filters
        if (minDaysAgo !== undefined && giorniPassati < minDaysAgo) continue;
        if (maxDaysAgo !== undefined && giorniPassati > maxDaysAgo) continue;
        
        // Apply venditore filter
        if (venditoreFilter && previousAssignment.venditore !== venditoreFilter) continue;

        analyzedLeads.push({
          id: lead.id,
          nome: lead.nome,
          cognome: lead.cognome,
          email: lead.email,
          telefono: lead.telefono,
          fonte_attuale: lead.fonte,
          created_at: lead.created_at,
          previous_venditore: previousAssignment.venditore,
          previous_data_assegnazione: previousAssignment.data_assegnazione,
          previous_ultima_fonte: previousAssignment.ultima_fonte,
          giorni_da_assegnazione: giorniPassati,
        });
      } else {
        leadsWithoutPrevious.push(lead);
      }
    }

    console.log('Leads with previous seller:', analyzedLeads.length);
    console.log('Leads without previous seller:', leadsWithoutPrevious.length);

    // Group by venditore
    const byVenditore: Record<string, VenditoreGroup> = {};
    
    for (const lead of analyzedLeads) {
      if (!byVenditore[lead.previous_venditore]) {
        byVenditore[lead.previous_venditore] = {
          venditore: lead.previous_venditore,
          count: 0,
          oldestAssignment: lead.previous_data_assegnazione,
          newestAssignment: lead.previous_data_assegnazione,
          leads: [],
        };
      }
      
      const group = byVenditore[lead.previous_venditore];
      group.count++;
      group.leads.push(lead);
      
      // Update date ranges
      if (new Date(lead.previous_data_assegnazione) < new Date(group.oldestAssignment)) {
        group.oldestAssignment = lead.previous_data_assegnazione;
      }
      if (new Date(lead.previous_data_assegnazione) > new Date(group.newestAssignment)) {
        group.newestAssignment = lead.previous_data_assegnazione;
      }
    }

    // Sort groups by count descending
    const sortedGroups = Object.values(byVenditore).sort((a, b) => b.count - a.count);

    // Sort leads within each group by giorni_da_assegnazione ascending
    for (const group of sortedGroups) {
      group.leads.sort((a, b) => a.giorni_da_assegnazione - b.giorni_da_assegnazione);
    }

    const response = {
      summary: {
        totalRoundRobinLeads: roundRobinLeads?.length || 0,
        withPreviousSeller: analyzedLeads.length,
        withoutPreviousSeller: leadsWithoutPrevious.length,
        uniqueVenditori: sortedGroups.length,
      },
      byVenditore: sortedGroups,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-round-robin-analysis:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function findPreviousAssignment(
  supabase: any, 
  lead: Lead, 
  market: string
): Promise<PreviousAssignment | null> {
  // Try by email first
  if (lead.email) {
    const { data: emailMatches } = await supabase
      .from('lead_generation')
      .select('venditore, data_assegnazione, ultima_fonte')
      .eq('email', lead.email)
      .eq('market', market)
      .neq('venditore', 'Round Robin')
      .not('venditore', 'is', null)
      .not('data_assegnazione', 'is', null)
      .order('data_assegnazione', { ascending: false })
      .limit(1);

    if (emailMatches && emailMatches.length > 0) {
      return {
        venditore: emailMatches[0].venditore,
        data_assegnazione: emailMatches[0].data_assegnazione,
        ultima_fonte: emailMatches[0].ultima_fonte,
      };
    }
  }

  // Try by phone
  if (lead.telefono) {
    const { data: phoneMatches } = await supabase
      .from('lead_generation')
      .select('venditore, data_assegnazione, ultima_fonte')
      .eq('telefono', lead.telefono)
      .eq('market', market)
      .neq('venditore', 'Round Robin')
      .not('venditore', 'is', null)
      .not('data_assegnazione', 'is', null)
      .order('data_assegnazione', { ascending: false })
      .limit(1);

    if (phoneMatches && phoneMatches.length > 0) {
      return {
        venditore: phoneMatches[0].venditore,
        data_assegnazione: phoneMatches[0].data_assegnazione,
        ultima_fonte: phoneMatches[0].ultima_fonte,
      };
    }
  }

  return null;
}
