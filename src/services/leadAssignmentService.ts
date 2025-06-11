
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LeadAssignmentData {
  numLead: number;
  venditore: string;
  campagna?: string;
  excludedSources?: string[];
}

export async function assignLeadsWithExclusions(data: LeadAssignmentData) {
  const { numLead, venditore, campagna, excludedSources = [] } = data;

  try {
    console.log(`Attempting to assign ${numLead} leads to ${venditore}`);
    console.log('Excluded sources:', excludedSources);

    // QUERY CRITICA: Escludere SEMPRE lead con call prenotate
    let query = supabase
      .from('lead_generation')
      .select('id, nome, cognome, email, telefono, fonte, created_at')
      .eq('assignable', true)
      .is('venditore', null)
      .neq('booked_call', 'SI'); // CRITICO: Non assegnare lead con call prenotate

    // Apply source exclusions
    if (excludedSources.length > 0) {
      excludedSources.forEach(source => {
        query = query.not('fonte', 'like', `%${source}%`);
      });
    }

    // Get available leads
    const { data: availableLeads, error: fetchError } = await query
      .order('created_at', { ascending: true })
      .limit(numLead);

    if (fetchError) {
      console.error('Error fetching leads:', fetchError);
      throw new Error(`Errore nel recupero dei lead: ${fetchError.message}`);
    }

    if (!availableLeads || availableLeads.length === 0) {
      throw new Error('Nessun lead disponibile per l\'assegnazione');
    }

    if (availableLeads.length < numLead) {
      console.warn(`Solo ${availableLeads.length} lead disponibili su ${numLead} richiesti`);
    }

    const actualAssignedCount = availableLeads.length;
    const leadIds = availableLeads.map(lead => lead.id);

    console.log(`Assigning ${actualAssignedCount} leads:`, leadIds);

    // Update the leads with the assigned salesperson
    const { error: updateError } = await supabase
      .from('lead_generation')
      .update({ 
        venditore,
        campagna: campagna || null,
        stato: 'assegnato'
      })
      .in('id', leadIds);

    if (updateError) {
      console.error('Error updating leads:', updateError);
      throw new Error(`Errore nell'aggiornamento dei lead: ${updateError.message}`);
    }

    // Record the assignment in history
    const { error: historyError } = await supabase
      .from('assignment_history')
      .insert({
        venditore,
        leads_count: actualAssignedCount,
        campagna: campagna || null,
        fonti_escluse: excludedSources.length > 0 ? excludedSources : null
      });

    if (historyError) {
      console.error('Error recording assignment history:', historyError);
      // Don't throw here as the main assignment succeeded
    }

    // Update salesperson's current lead count
    const { error: venditorError } = await supabase
      .from('venditori')
      .update({
        lead_attuali: supabase.rpc('increment_lead_count', { venditore_name: venditore, increment: actualAssignedCount })
      })
      .eq('nome', venditore);

    if (venditorError) {
      console.error('Error updating salesperson lead count:', venditorError);
      // Don't throw here as the main assignment succeeded
    }

    console.log(`Successfully assigned ${actualAssignedCount} leads to ${venditore}`);
    return { assignedCount: actualAssignedCount, leads: availableLeads };

  } catch (error) {
    console.error('Assignment error:', error);
    throw error;
  }
}

export async function getAvailableLeadsCount(excludedSources: string[] = []): Promise<number> {
  try {
    // QUERY CRITICA: Contare solo lead senza call prenotate
    let query = supabase
      .from('lead_generation')
      .select('id', { count: 'exact', head: true })
      .eq('assignable', true)
      .is('venditore', null)
      .neq('booked_call', 'SI'); // CRITICO: Escludere lead con call prenotate

    // Apply source exclusions
    if (excludedSources.length > 0) {
      excludedSources.forEach(source => {
        query = query.not('fonte', 'like', `%${source}%`);
      });
    }

    const { count, error } = await query;
    
    if (error) {
      console.error('Error counting available leads:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Error in getAvailableLeadsCount:', error);
    return 0;
  }
}
