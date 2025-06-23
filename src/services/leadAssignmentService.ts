
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export interface LeadAssignmentData {
  numLead: number;
  venditore: string;
  campagna: string | null;
  excludedSources: string[];
  includedSources: string[];
  sourceMode: 'exclude' | 'include';
  bypassTimeInterval: boolean;
  excludeFromIncluded: string[];
}

export async function assignLeadsWithExclusions({
  numLead,
  venditore,
  campagna,
  excludedSources,
  includedSources,
  sourceMode,
  bypassTimeInterval,
  excludeFromIncluded
}: LeadAssignmentData): Promise<void> {
  if (numLead <= 0 || !venditore) {
    console.warn("Invalid assignment parameters. Aborting assignment.");
    return;
  }

  let query = supabase
    .from('lead_generation')
    .select('*')
    .eq('venditore', null)
    .eq('assignable', true)

  if (bypassTimeInterval) {
    console.log("Bypassing time interval for lead assignment.");
  } else {
    // Filtra i lead creati negli ultimi 7 giorni
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    query = query.gte('created_at', sevenDaysAgo.toISOString());
  }

  if (sourceMode === 'exclude' && excludedSources.length > 0) {
    query = query.not('fonte', 'in', excludedSources);
  } else if (sourceMode === 'include' && includedSources.length > 0) {
    query = query.in('fonte', includedSources);

    if (excludeFromIncluded.length > 0) {
      query = query.not('fonte', 'in', excludeFromIncluded);
    }
  }

  const { data: leads, error: leadsError } = await query
    .limit(numLead);

  if (leadsError) {
    console.error("Error fetching leads:", leadsError);
    throw new Error(leadsError.message);
  }

  if (!leads || leads.length === 0) {
    console.warn("No assignable leads found with current criteria.");
    return;
  }

  const leadIds = leads.map(lead => lead.id);

  const { error: updateError } = await supabase
    .from('lead_generation')
    .update({ venditore: venditore })
    .in('id', leadIds);

  if (updateError) {
    console.error("Error updating leads:", updateError);
    throw new Error(updateError.message);
  }

  // After successful assignment, save to history
  const { error: historyError } = await supabase
    .from('assignment_history')
    .insert({
      leads_count: numLead,
      venditore,
      campagna: campagna || null,
      fonti_escluse: sourceMode === 'exclude' ? excludedSources : null,
      fonti_incluse: sourceMode === 'include' ? includedSources : null,
      exclude_from_included: excludeFromIncluded.length > 0 ? excludeFromIncluded : null,
      source_mode: sourceMode,
      bypass_time_interval: bypassTimeInterval
    });

  if (historyError) {
    console.error("Error saving assignment history:", historyError);
  }

  // Webhook notification (replace with your actual webhook logic)
  try {
    const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `${numLead} leads assigned to ${venditore}`,
          leadIds: leadIds,
        }),
      });

      if (!response.ok) {
        console.error('Webhook request failed:', response.status, response.statusText);
      }
    } else {
      console.warn('Webhook URL not configured. Skipping webhook notification.');
    }
  } catch (webhookError) {
    console.error('Error sending webhook:', webhookError);
  }
}

export const getAvailableLeadsCount = async (
  excludedSources: string[],
  includedSources: string[],
  sourceMode: 'exclude' | 'include',
  bypassTimeInterval: boolean,
  excludeFromIncluded: string[]
): Promise<number> => {
  try {
    console.log(`🔍 Getting available leads count with filters:`, {
      sourceMode,
      excludedSources: excludedSources.length,
      includedSources: includedSources.length,
      excludeFromIncluded: excludeFromIncluded.length,
      bypassTimeInterval
    });

    // Prima verifichiamo il conteggio totale dei lead nel database
    const { count: totalLeads, error: totalError } = await supabase
      .from('lead_generation')
      .select('*', { count: 'exact' });

    if (totalError) {
      console.error("Error fetching total leads:", totalError);
    } else {
      console.log(`📊 Total leads in database: ${totalLeads || 0}`);
    }

    // Poi verifichiamo quanti sono assignable=true
    const { count: assignableLeads, error: assignableError } = await supabase
      .from('lead_generation')
      .select('*', { count: 'exact' })
      .eq('assignable', true);

    if (assignableError) {
      console.error("Error fetching assignable leads:", assignableError);
    } else {
      console.log(`📊 Assignable leads: ${assignableLeads || 0}`);
    }

    // Poi verifichiamo quanti hanno venditore=null
    const { count: unassignedLeads, error: unassignedError } = await supabase
      .from('lead_generation')
      .select('*', { count: 'exact' })
      .eq('assignable', true)
      .eq('venditore', null);

    if (unassignedError) {
      console.error("Error fetching unassigned leads:", unassignedError);
    } else {
      console.log(`📊 Unassigned assignable leads: ${unassignedLeads || 0}`);
    }

    // Ora costruiamo la query finale
    let query = supabase
      .from('lead_generation')
      .select('*', { count: 'exact' })
      .eq('venditore', null)
      .eq('assignable', true);

    if (bypassTimeInterval) {
      console.log("🚀 Bypassing time interval for lead count.");
    } else {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      console.log(`📅 Filtering leads created after: ${sevenDaysAgo.toISOString()}`);
      query = query.gte('created_at', sevenDaysAgo.toISOString());
    }

    if (sourceMode === 'exclude' && excludedSources.length > 0) {
      console.log(`🚫 Excluding sources: ${excludedSources.join(', ')}`);
      query = query.not('fonte', 'in', excludedSources);
    } else if (sourceMode === 'include' && includedSources.length > 0) {
      console.log(`✅ Including only sources: ${includedSources.join(', ')}`);
      query = query.in('fonte', includedSources);

      if (excludeFromIncluded.length > 0) {
        console.log(`➖ Excluding from included sources: ${excludeFromIncluded.join(', ')}`);
        query = query.not('fonte', 'in', excludeFromIncluded);
      }
    }

    const { count, error } = await query;

    if (error) {
      console.error("❌ Error fetching available leads count:", error);
      return 0;
    }

    console.log(`📊 Final available leads count result: ${count || 0}`);
    return count || 0;
  } catch (error) {
    console.error("❌ Error in getAvailableLeadsCount:", error);
    return 0;
  }
};
