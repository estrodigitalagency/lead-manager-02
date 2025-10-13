import { supabase } from "@/integrations/supabase/client";
import { assignLeadsWithExclusions } from "./leadAssignmentService";

export interface ReplayAssignmentParams {
  historyId: string;
  newVenditore: string;
  newCampagna?: string;
}

/**
 * Replay an assignment from history by reassigning the exact same leads to a new salesperson
 */
export async function replayAssignment(params: ReplayAssignmentParams) {
  const { historyId, newVenditore, newCampagna } = params;

  try {
    console.log(`Starting replay for assignment history ID: ${historyId}`);

    // 1. Fetch the original assignment record with lead_ids
    const { data: historyRecord, error: fetchError } = await supabase
      .from('assignment_history')
      .select('*')
      .eq('id', historyId)
      .single();

    if (fetchError || !historyRecord) {
      throw new Error(`Impossibile recuperare l'assegnazione originale: ${fetchError?.message}`);
    }

    if (!historyRecord.lead_ids || historyRecord.lead_ids.length === 0) {
      throw new Error('Questa assegnazione non ha lead specifici tracciati. Impossibile eseguire il replay.');
    }

    console.log(`Found ${historyRecord.lead_ids.length} lead IDs for replay`);

    // 2. Reset the leads to unassigned state
    console.log('Resetting leads to unassigned state...');
    const { error: resetError } = await supabase
      .from('lead_generation')
      .update({
        venditore: null,
        stato: 'nuovo',
        assignable: false,
        data_assegnazione: null,
        updated_at: new Date().toISOString()
      })
      .in('id', historyRecord.lead_ids);

    if (resetError) {
      throw new Error(`Errore nel reset dei lead: ${resetError.message}`);
    }

    console.log('Leads reset successfully');

    // 3. Reassign the leads using assignLeadsWithExclusions with specificLeadIds
    console.log(`Reassigning ${historyRecord.lead_ids.length} leads to ${newVenditore}...`);
    
    const result = await assignLeadsWithExclusions({
      numLead: historyRecord.leads_count,
      venditore: newVenditore,
      campagna: newCampagna || historyRecord.campagna || undefined,
      excludedSources: historyRecord.fonti_escluse || undefined,
      includedSources: historyRecord.fonti_incluse || undefined,
      sourceMode: (historyRecord.source_mode as 'exclude' | 'include') || 'exclude',
      bypassTimeInterval: historyRecord.bypass_time_interval || false,
      excludeFromIncluded: historyRecord.exclude_from_included || undefined,
      onlyHotLeads: false,
      market: historyRecord.market as 'IT' | 'ES',
      specificLeadIds: historyRecord.lead_ids // This tells assignLeadsWithExclusions to use these specific leads
    });

    console.log(`Replay completed successfully: ${result.assignedCount} leads assigned`);
    return result;

  } catch (error) {
    console.error('Error in replayAssignment:', error);
    throw error;
  }
}
