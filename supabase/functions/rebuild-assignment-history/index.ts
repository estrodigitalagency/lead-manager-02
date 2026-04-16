import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Lead {
  id: string;
  venditore: string | null;
  campagna: string | null;
  data_assegnazione: string | null;
  fonte: string | null;
  market: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Starting assignment history rebuild...');

    // Fetch all leads with assigned sellers
    const { data: leads, error: leadsError } = await supabase
      .from('lead_generation')
      .select('id, venditore, campagna, data_assegnazione, fonte, market')
      .not('venditore', 'is', null)
      .not('data_assegnazione', 'is', null)
      .order('data_assegnazione', { ascending: true });

    if (leadsError) {
      console.error('❌ Error fetching leads:', leadsError);
      throw leadsError;
    }

    console.log(`📊 Found ${leads?.length || 0} assigned leads`);

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No assigned leads found',
          recordsCreated: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group leads by venditore, campagna, data_assegnazione, and market
    const assignmentGroups = new Map<string, {
      venditore: string;
      campagna: string | null;
      assigned_at: string;
      market: string;
      lead_ids: string[];
      fonti: Set<string>;
    }>();

    for (const lead of leads as Lead[]) {
      // Create a key for grouping (same day assignments to same seller)
      const assignmentDate = new Date(lead.data_assegnazione!);
      const dateKey = assignmentDate.toISOString().split('T')[0]; // Just the date part
      const groupKey = `${lead.venditore}_${lead.campagna || 'no-campaign'}_${dateKey}_${lead.market}`;

      if (!assignmentGroups.has(groupKey)) {
        assignmentGroups.set(groupKey, {
          venditore: lead.venditore!,
          campagna: lead.campagna,
          assigned_at: lead.data_assegnazione!,
          market: lead.market,
          lead_ids: [],
          fonti: new Set()
        });
      }

      const group = assignmentGroups.get(groupKey)!;
      group.lead_ids.push(lead.id);
      if (lead.fonte) {
        group.fonti.add(lead.fonte);
      }
    }

    console.log(`📦 Created ${assignmentGroups.size} assignment groups`);

    // Insert into assignment_history
    const historyRecords = Array.from(assignmentGroups.values()).map(group => ({
      venditore: group.venditore,
      campagna: group.campagna,
      assigned_at: group.assigned_at,
      market: group.market,
      leads_count: group.lead_ids.length,
      lead_ids: group.lead_ids,
      fonti_incluse: Array.from(group.fonti),
      source_mode: 'include',
      bypass_time_interval: false
    }));

    const { data: insertedRecords, error: insertError } = await supabase
      .from('assignment_history')
      .insert(historyRecords)
      .select();

    if (insertError) {
      console.error('❌ Error inserting history records:', insertError);
      throw insertError;
    }

    console.log(`✅ Successfully created ${insertedRecords?.length || 0} history records`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Rebuilt assignment history from ${leads.length} leads`,
        recordsCreated: insertedRecords?.length || 0,
        assignmentGroups: assignmentGroups.size
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error rebuilding assignment history:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
