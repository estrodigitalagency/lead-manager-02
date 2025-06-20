
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Global refresh callback for triggering UI updates
let globalRefreshCallback: (() => Promise<void>) | null = null;

export function setGlobalRefreshCallback(callback: (() => Promise<void>) | null) {
  globalRefreshCallback = callback;
}

export async function makeLeadAssignable(leadId: string) {
  try {
    console.log(`Making lead ${leadId} assignable and removing vendor...`);
    
    const { error } = await supabase
      .from('lead_generation')
      .update({ 
        assignable: true,
        venditore: null,
        stato: 'nuovo',
        data_assegnazione: null
      })
      .eq('id', leadId);

    if (error) {
      console.error('Error making lead assignable:', error);
      throw error;
    }

    console.log(`Lead ${leadId} successfully made assignable and vendor removed`);
    toast.success('Lead reso assegnabile e venditore rimosso con successo');
    
    if (globalRefreshCallback) {
      await globalRefreshCallback();
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in makeLeadAssignable:', error);
    toast.error('Errore nel rendere il lead assegnabile');
    throw error;
  }
}

export async function checkLeadsAssignability() {
  try {
    console.log("🔍 Starting optimized lead assignability verification...");
    
    // Recupera le impostazioni per il calcolo dell'età dei lead
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'days_before_assignable')
      .single();

    const daysBeforeAssignable = settingsData?.value ? parseInt(settingsData.value) : 7;
    console.log(`Using ${daysBeforeAssignable} days as threshold for assignability`);

    // Calcola la data di cutoff
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBeforeAssignable);
    const cutoffDateISO = cutoffDate.toISOString();

    console.log(`Cutoff date for assignability: ${cutoffDateISO}`);

    // OPERAZIONE 1: Rendi NON assegnabili tutti i lead con call prenotate
    console.log("Step 1: Setting leads with booked calls as non-assignable...");
    const { error: bookedCallError } = await supabase
      .from('lead_generation')
      .update({ assignable: false })
      .eq('booked_call', 'SI');

    if (bookedCallError) {
      console.error('Error updating booked call leads:', bookedCallError);
    }

    // OPERAZIONE 2: Rendi NON assegnabili tutti i lead con venditore già assegnato
    console.log("Step 2: Setting leads with assigned vendors as non-assignable...");
    const { error: assignedError } = await supabase
      .from('lead_generation')
      .update({ assignable: false })
      .not('venditore', 'is', null);

    if (assignedError) {
      console.error('Error updating assigned leads:', assignedError);
    }

    // OPERAZIONE 3: Rendi assegnabili i lead che soddisfano tutti i criteri
    console.log("Step 3: Setting eligible leads as assignable...");
    const { data: updatedLeads, error: assignableError } = await supabase
      .from('lead_generation')
      .update({ assignable: true })
      .eq('booked_call', 'NO')
      .is('venditore', null)
      .lte('created_at', cutoffDateISO)
      .select('id');

    if (assignableError) {
      console.error('Error updating assignable leads:', assignableError);
      throw assignableError;
    }

    const updatedCount = updatedLeads?.length || 0;

    // Conta i lead disponibili finali
    const { count: availableLeads } = await supabase
      .from('lead_generation')
      .select('*', { count: 'exact', head: true })
      .eq('assignable', true)
      .is('venditore', null)
      .eq('booked_call', 'NO');

    console.log(`✅ Optimized verification completed: ${updatedCount} leads updated`);
    console.log(`Available leads: ${availableLeads || 0}`);
    
    // RIMUOVO IL TOAST DA QUI - sarà gestito solo dal hook
    
    // Trigger global refresh if callback is available
    if (globalRefreshCallback) {
      await globalRefreshCallback();
    }
    
    return { 
      updated: updatedCount, 
      totalChecked: updatedCount, // Semplificato per performance
      availableLeads: availableLeads || 0 
    };
  } catch (error) {
    console.error('❌ Error in optimized checkLeadsAssignability:', error);
    // RIMUOVO IL TOAST DI ERRORE DA QUI - sarà gestito solo dal hook
    throw error;
  }
}

export async function getOptimizedLeadCounts() {
  try {
    const [totalResult, assignableResult, assignedResult, bookedResult] = await Promise.all([
      supabase.from('lead_generation').select('id', { count: 'exact', head: true }),
      supabase.from('lead_generation').select('id', { count: 'exact', head: true })
        .eq('assignable', true)
        .is('venditore', null)
        .eq('booked_call', 'NO'),
      supabase.from('lead_generation').select('id', { count: 'exact', head: true })
        .not('venditore', 'is', null),
      supabase.from('booked_call').select('id', { count: 'exact', head: true })
    ]);

    return {
      total: totalResult.count || 0,
      assignable: assignableResult.count || 0,
      assigned: assignedResult.count || 0,
      booked: bookedResult.count || 0
    };
  } catch (error) {
    console.error('Error fetching optimized lead counts:', error);
    return {
      total: 0,
      assignable: 0,
      assigned: 0,
      booked: 0
    };
  }
}

// Legacy function name for compatibility
export const verifyLeadAssignability = checkLeadsAssignability;
