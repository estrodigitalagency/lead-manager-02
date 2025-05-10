
import { Lead } from "@/types/lead";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Get all leads that haven't been assigned yet and are assignable
export async function getUnassignedLeads(): Promise<Lead[]> {
  try {
    const { data, error } = await supabase
      .from('lead_generation')
      .select('*')
      .eq('assignable', true)
      .is('venditore', null);
    
    if (error) {
      console.error("Error fetching unassigned leads:", error);
      toast.error("Errore nel recupero dei lead non assegnati");
      return [];
    }
    
    return data as Lead[];
  } catch (error) {
    console.error("Error fetching unassigned leads:", error);
    toast.error("Errore nel recupero dei lead non assegnati");
    return [];
  }
}

// Add a new lead (e.g. from webhook)
export async function addLead(lead: Omit<Lead, 'id' | 'assignable' | 'created_at'>): Promise<Lead | null> {
  try {
    // Convert boolean booked_call to string 'SI'/'NO' format
    const isBooked = typeof lead.booked_call === 'string' 
      ? lead.booked_call === "SI" 
      : !!lead.booked_call;
    
    // Lead is assignable only if booked_call is NO and enough days have passed (this check will be done by the lead-check function)
    const leadToInsert = {
      ...lead,
      booked_call: isBooked ? 'SI' : 'NO', // Always store as string
      assignable: false  // Start as not assignable, will be updated by lead-check function
    };
    
    const { data, error } = await supabase
      .from('lead_generation')
      .insert({
        ...leadToInsert
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error adding lead:", error);
      toast.error("Errore nell'aggiunta del nuovo lead");
      return null;
    }
    
    // After adding a lead, trigger the lead-check function to update assignability
    try {
      await triggerLeadCheck();
    } catch (checkError) {
      console.error("Error checking lead assignability after adding:", checkError);
      // Don't return error here, as the lead was successfully added
    }
    
    return data as Lead;
  } catch (error) {
    console.error("Error adding lead:", error);
    toast.error("Errore nell'aggiunta del nuovo lead");
    return null;
  }
}

// Mark leads as assigned
export async function markLeadsAsAssigned(numLeads: number, venditore: string, campagna?: string): Promise<Lead[]> {
  try {
    // Get unassigned leads that are assignable up to the requested number
    const { data: leadsToAssign, error: fetchError } = await supabase
      .from('lead_generation')
      .select('*')
      .eq('assignable', true)
      .is('venditore', null)
      .order('created_at', { ascending: true })
      .limit(numLeads);
    
    if (fetchError || !leadsToAssign || leadsToAssign.length < numLeads) {
      console.error("Error fetching leads to assign:", fetchError);
      toast.error(`Solo ${leadsToAssign?.length || 0} lead disponibili per l'assegnazione.`);
      if (!leadsToAssign) return [];
    }
    
    // Update leads to mark them as assigned
    const leadIds = leadsToAssign?.map(lead => lead.id) || [];
    
    if (leadIds.length === 0) {
      return [];
    }
    
    // Create update object with only fields that exist in the database
    const updateObj: Record<string, any> = { venditore };
    if (campagna) updateObj.campagna = campagna;
    
    const { error: updateError } = await supabase
      .from('lead_generation')
      .update(updateObj)
      .in('id', leadIds);
    
    if (updateError) {
      console.error("Error marking leads as assigned:", updateError);
      toast.error("Errore nell'assegnazione dei lead");
      return [];
    }
    
    // Return the assigned leads
    return leadsToAssign as Lead[];
  } catch (error) {
    console.error("Error marking leads as assigned:", error);
    toast.error("Errore nell'assegnazione dei lead");
    return [];
  }
}

// Manually trigger the lead check function
export async function triggerLeadCheck(): Promise<boolean> {
  try {
    const supabaseUrl = "https://btcwmuyemmkiteqlopce.supabase.co";
    
    // Show loading toast
    const toastId = toast.loading("Controllo dei lead in corso...");
    
    const response = await fetch(`${supabaseUrl}/functions/v1/lead-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const result = await response.json();
    console.log("Lead check result:", result);
    
    // Update the toast with results
    toast.dismiss(toastId);
    toast.success(`Controllo completato: ${result.updated} lead aggiornati su ${result.checked} controllati`);
    return true;
  } catch (error) {
    console.error("Error triggering lead check:", error);
    toast.error("Errore nell'avvio del controllo dei lead");
    return false;
  }
}
