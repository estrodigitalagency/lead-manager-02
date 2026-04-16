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

    // Collect ALL unique emails and phones
    const allEmails: string[] = [];
    const allPhones: string[] = [];

    for (const lead of allRoundRobinLeads) {
      if (lead.email) allEmails.push(lead.email);
      if (lead.telefono) allPhones.push(lead.telefono);
    }

    const uniqueEmailsSet = new Set(allEmails.map(e => e.toLowerCase()));
    const uniquePhonesSet = new Set(allPhones);

    console.log('Unique emails:', uniqueEmailsSet.size, '- Unique phones:', uniquePhonesSet.size);

    // Batch fetch ALL previous assignments by email (case-insensitive via raw SQL)
    // We need to get records with venditore != 'Round Robin' that match our emails
    const emailToPreviousAssignment: Record<string, { venditore: string; data_assegnazione: string; ultima_fonte: string | null }> = {};
    
    // Use original emails for the query to handle case-sensitivity
    const uniqueEmailsArray = [...new Set(allEmails)]; // Original case
    
    if (uniqueEmailsArray.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < uniqueEmailsArray.length; i += batchSize) {
        const batch = uniqueEmailsArray.slice(i, i + batchSize);
        
        // Query with original case - PostgreSQL stores emails as-is
        const { data: emailMatches, error } = await supabase
          .from('lead_generation')
          .select('email, venditore, data_assegnazione, ultima_fonte')
          .in('email', batch)
          .eq('market', market)
          .neq('venditore', 'Round Robin')
          .not('venditore', 'is', null)
          .not('data_assegnazione', 'is', null)
          .order('data_assegnazione', { ascending: false });

        if (error) {
          console.error('Error fetching email matches batch', i, ':', error);
        }

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

    // Batch fetch ALL previous assignments by phone
    const phoneToPreviousAssignment: Record<string, { venditore: string; data_assegnazione: string; ultima_fonte: string | null }> = {};
    
    const uniquePhonesArray = [...uniquePhonesSet];
    
    if (uniquePhonesArray.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < uniquePhonesArray.length; i += batchSize) {
        const batch = uniquePhonesArray.slice(i, i + batchSize);
        const { data: phoneMatches, error } = await supabase
          .from('lead_generation')
          .select('telefono, venditore, data_assegnazione, ultima_fonte')
          .in('telefono', batch)
          .eq('market', market)
          .neq('venditore', 'Round Robin')
          .not('venditore', 'is', null)
          .not('data_assegnazione', 'is', null)
          .order('data_assegnazione', { ascending: false });

        if (error) {
          console.error('Error fetching phone matches batch', i, ':', error);
        }

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
    // Priority: email match first, then phone match
    const analyzedLeads: AnalyzedLead[] = [];
    let leadsWithoutPrevious = 0;

    for (const lead of allRoundRobinLeads) {
      let previousAssignment = null;

      // Try email first (case-insensitive lookup)
      if (lead.email) {
        previousAssignment = emailToPreviousAssignment[lead.email.toLowerCase()];
      }

      // Then try phone if no email match
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

    console.log('Leads with previous seller (after day filter):', analyzedLeads.length);
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

    // Calculate total with previous BEFORE day filter (for accurate stats)
    const totalWithPrevious = allRoundRobinLeads.filter(lead => {
      if (lead.email && emailToPreviousAssignment[lead.email.toLowerCase()]) return true;
      if (lead.telefono && phoneToPreviousAssignment[lead.telefono]) return true;
      return false;
    }).length;

    const response = {
      summary: {
        totalRoundRobinLeads: allRoundRobinLeads.length,
        withPreviousSeller: totalWithPrevious, // Total BEFORE day filter
        withPreviousSellerFiltered: analyzedLeads.length, // After day filter
        withoutPreviousSeller: allRoundRobinLeads.length - totalWithPrevious,
        uniqueVenditori: sortedGroups.length,
      },
      byVenditore: sortedGroups,
    };

    console.log('Analysis complete. Total with previous:', totalWithPrevious, '- Filtered:', analyzedLeads.length, '- Groups:', sortedGroups.length);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-round-robin-analysis:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
