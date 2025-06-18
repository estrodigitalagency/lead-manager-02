
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
        venditore: null, // Rimuove il venditore
        stato: 'nuovo',  // Reimposta lo stato a nuovo
        data_assegnazione: null // Rimuove anche la data di assegnazione
      })
      .eq('id', leadId);

    if (error) {
      console.error('Error making lead assignable:', error);
      throw error;
    }

    console.log(`Lead ${leadId} successfully made assignable and vendor removed`);
    toast.success('Lead reso assegnabile e venditore rimosso con successo');
    
    // Trigger global refresh if callback is available
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
    console.log("🔍 Starting lead assignability verification...");
    
    // Prima recupera le impostazioni per il calcolo dell'età dei lead
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'days_before_assignable')
      .single();

    const daysBeforeAssignable = settingsData?.value ? parseInt(settingsData.value) : 7;
    console.log(`Using ${daysBeforeAssignable} days as threshold for assignability`);

    // Recupera tutti i lead per la verifica
    const { data: leads, error: fetchError } = await supabase
      .from('lead_generation')
      .select('id, created_at, booked_call, venditore, assignable')
      .limit(1000); // Limit to prevent timeout

    if (fetchError) {
      console.error('❌ Error fetching leads for verification:', fetchError);
      throw fetchError;
    }

    if (!leads || leads.length === 0) {
      console.log("No leads found for verification");
      return { updated: 0, totalChecked: 0, availableLeads: 0 };
    }

    console.log(`📊 Checking ${leads.length} leads for assignability...`);

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (daysBeforeAssignable * 24 * 60 * 60 * 1000));
    
    let updatedCount = 0;
    const batchSize = 20; // Reduced batch size for better performance
    
    // Processa i lead in batch per evitare timeout
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(leads.length/batchSize)} (${batch.length} leads)`);
      
      const updates = [];
      
      for (const lead of batch) {
        const leadDate = new Date(lead.created_at);
        const isOldEnough = leadDate <= cutoffDate;
        const hasBookedCall = lead.booked_call === 'SI';
        const hasVendor = lead.venditore !== null;
        
        // Un lead è assegnabile se:
        // 1. Non ha una call prenotata E
        // 2. È abbastanza vecchio (oltre la soglia) E  
        // 3. Non ha già un venditore assegnato
        const shouldBeAssignable = !hasBookedCall && isOldEnough && !hasVendor;
        
        if (lead.assignable !== shouldBeAssignable) {
          updates.push({
            id: lead.id,
            assignable: shouldBeAssignable
          });
        }
      }
      
      // Execute batch updates using individual updates to avoid issues
      if (updates.length > 0) {
        console.log(`Updating ${updates.length} leads in current batch`);
        
        // Process updates in smaller chunks to avoid timeout
        const updatePromises = updates.map(async (update) => {
          try {
            const { error } = await supabase
              .from('lead_generation')
              .update({ assignable: update.assignable })
              .eq('id', update.id);
            
            if (error) {
              console.error(`Error updating lead ${update.id}:`, error);
              return false;
            }
            return true;
          } catch (error) {
            console.error(`Exception updating lead ${update.id}:`, error);
            return false;
          }
        });
        
        // Wait for all updates in this batch with timeout
        try {
          const results = await Promise.allSettled(updatePromises);
          const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
          updatedCount += successful;
          console.log(`Batch completed: ${successful}/${updates.length} updates successful`);
        } catch (error) {
          console.error('Error in batch update:', error);
        }
      }
      
      // Add a small delay between batches to prevent overwhelming the database
      if (i + batchSize < leads.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Conta i lead disponibili
    const { count: availableLeads } = await supabase
      .from('lead_generation')
      .select('*', { count: 'exact', head: true })
      .eq('assignable', true)
      .is('venditore', null)
      .eq('booked_call', 'NO');

    console.log(`✅ Verification completed: ${updatedCount} leads updated out of ${leads.length} checked`);
    
    if (updatedCount > 0) {
      toast.success(`Verifica completata: ${updatedCount} lead aggiornati`);
    }
    
    // Trigger global refresh if callback is available
    if (globalRefreshCallback) {
      await globalRefreshCallback();
    }
    
    return { updated: updatedCount, totalChecked: leads.length, availableLeads: availableLeads || 0 };
  } catch (error) {
    console.error('❌ Error in checkLeadsAssignability:', error);
    toast.error('Errore durante la verifica dell\'assegnabilità');
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
