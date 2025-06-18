
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    
    return { success: true };
  } catch (error) {
    console.error('Error in makeLeadAssignable:', error);
    toast.error('Errore nel rendere il lead assegnabile');
    throw error;
  }
}

export async function verifyLeadAssignability() {
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
      .select('id, created_at, booked_call, venditore, assignable');

    if (fetchError) {
      console.error('❌ Error fetching leads for verification:', fetchError);
      throw fetchError;
    }

    if (!leads) {
      console.log("No leads found for verification");
      return { updated: 0, totalChecked: 0 };
    }

    console.log(`📊 Checking ${leads.length} leads for assignability...`);

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (daysBeforeAssignable * 24 * 60 * 60 * 1000));
    
    let updatedCount = 0;
    const batchSize = 50;
    
    // Processa i lead in batch per evitare timeout
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(leads.length/batchSize)}`);
      
      const updates = batch.map(lead => {
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
          return {
            id: lead.id,
            assignable: shouldBeAssignable
          };
        }
        
        return null;
      }).filter(Boolean);

      if (updates.length > 0) {
        console.log(`Updating ${updates.length} leads in this batch`);
        
        // Usa upsert per aggiornare in batch
        const { error: updateError } = await supabase
          .from('lead_generation')
          .upsert(updates, { onConflict: 'id' });

        if (updateError) {
          console.error('❌ Error updating leads batch:', updateError);
          // Continua con il prossimo batch invece di fallire tutto
        } else {
          updatedCount += updates.length;
        }
      }
    }

    console.log(`✅ Verification completed: ${updatedCount} leads updated out of ${leads.length} checked`);
    
    if (updatedCount > 0) {
      toast.success(`Verifica completata: ${updatedCount} lead aggiornati`);
    }
    
    return { updated: updatedCount, totalChecked: leads.length };
  } catch (error) {
    console.error('❌ Error in verifyLeadAssignability:', error);
    toast.error('Errore durante la verifica dell\'assegnabilità');
    throw error;
  }
}
