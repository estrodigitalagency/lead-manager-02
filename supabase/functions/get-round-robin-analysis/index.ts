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

    // Get ALL Round Robin leads using pagination
    const allRoundRobinLeads: Lead[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: leads, error } = await supabase
        .from('lead_generation')
        .select('id, nome, cognome, email, telefono, fonte, created_at')
        .eq('venditore', 'Round Robin')
        .eq('market', market)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching Round Robin leads page', page, ':', error);
        throw error;
      }

      if (leads && leads.length > 0) {
        allRoundRobinLeads.push(...leads);
        console.log(`Page ${page + 1}: fetched ${leads.length} leads (total: ${allRoundRobinLeads.length})`);
        hasMore = leads.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    console.log('Total Round Robin leads found:', allRoundRobinLeads.length);

    // Collect unique emails and phones for batch lookup
    const uniqueEmails = new Set<string>();
    const uniquePhones = new Set<string>();

    for (const lead of allRoundRobinLeads) {
      if (lead.email) uniqueEmails.add(lead.email.toLowerCase());
      if (lead.telefono) uniquePhones.add(lead.telefono);
    }

    console.log('Unique emails:', uniqueEmails.size, '- Unique phones:', uniquePhones.size);

    // Batch fetch previous assignments by email
    const emailToPreviousAssignment: Record<string, { venditore: string; data_assegnazione: string; ultima_fonte: string | null }> = {};
    
    if (uniqueEmails.size > 0) {
      const emailArray = Array.from(uniqueEmails);
      // Process in batches of 500 to avoid query limits
      const batchSize = 500;
      for (let i = 0; i < emailArray.length; i += batchSize) {
        const batch = emailArray.slice(i, i + batchSize);
        const { data: emailMatches } = await supabase
          .from('lead_generation')
          .select('email, venditore, data_assegnazione, ultima_fonte')
          .in('email', batch)
          .eq('market', market)
          .neq('venditore', 'Round Robin')
          .not('venditore', 'is', null)
          .not('data_assegnazione', 'is', null)
          .order('data_assegnazione', { ascending: false });

        if (emailMatches) {
          for (const match of emailMatches) {
            const emailKey = match.email?.toLowerCase();
            if (emailKey && !emailToPreviousAssignment[emailKey]) {
              emailToPreviousAssignment[emailKey] = {
                venditore: match.venditore,
                data_assegnazione: match.data_assegnazione,
                ultima_fonte: match.ultima_fonte,
              };
            }
          }
        }
      }
    }

    console.log('Email matches found:', Object.keys(emailToPreviousAssignment).length);

    // Batch fetch previous assignments by phone (for those without email match)
    const phoneToPreviousAssignment: Record<string, { venditore: string; data_assegnazione: string; ultima_fonte: string | null }> = {};
    
    // Only look up phones for leads that don't have an email match
    const phonesToLookup = new Set<string>();
    for (const lead of allRoundRobinLeads) {
      if (lead.telefono && !lead.email || (lead.email && !emailToPreviousAssignment[lead.email.toLowerCase()])) {
        if (lead.telefono) phonesToLookup.add(lead.telefono);
      }
    }

    if (phonesToLookup.size > 0) {
      const phoneArray = Array.from(phonesToLookup);
      const batchSize = 500;
      for (let i = 0; i < phoneArray.length; i += batchSize) {
        const batch = phoneArray.slice(i, i + batchSize);
        const { data: phoneMatches } = await supabase
          .from('lead_generation')
          .select('telefono, venditore, data_assegnazione, ultima_fonte')
          .in('telefono', batch)
          .eq('market', market)
          .neq('venditore', 'Round Robin')
          .not('venditore', 'is', null)
          .not('data_assegnazione', 'is', null)
          .order('data_assegnazione', { ascending: false });

        if (phoneMatches) {
          for (const match of phoneMatches) {
            if (match.telefono && !phoneToPreviousAssignment[match.telefono]) {
              phoneToPreviousAssignment[match.telefono] = {
                venditore: match.venditore,
                data_assegnazione: match.data_assegnazione,
                ultima_fonte: match.ultima_fonte,
              };
            }
          }
        }
      }
    }

    console.log('Phone matches found:', Object.keys(phoneToPreviousAssignment).length);

    // Now process leads using the cached lookups
    const analyzedLeads: AnalyzedLead[] = [];
    let leadsWithoutPrevious = 0;

    for (const lead of allRoundRobinLeads) {
      let previousAssignment = null;

      // Try email first
      if (lead.email) {
        previousAssignment = emailToPreviousAssignment[lead.email.toLowerCase()];
      }

      // Then try phone
      if (!previousAssignment && lead.telefono) {
        previousAssignment = phoneToPreviousAssignment[lead.telefono];
      }

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
        leadsWithoutPrevious++;
      }
    }

    console.log('Leads with previous seller:', analyzedLeads.length);
    console.log('Leads without previous seller:', leadsWithoutPrevious);

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
        totalRoundRobinLeads: allRoundRobinLeads.length,
        withPreviousSeller: analyzedLeads.length,
        withoutPreviousSeller: leadsWithoutPrevious,
        uniqueVenditori: sortedGroups.length,
      },
      byVenditore: sortedGroups,
    };

    console.log('Analysis complete. Sending response with', sortedGroups.length, 'groups');

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
