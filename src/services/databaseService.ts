
import { Lead } from "@/types/lead";
import { LeadLavorato } from "@/types/leadLavorato";
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
export async function markLeadsAsAssigned(numLeads: number, venditore: string, campagna?: string, webhookUrl?: string): Promise<Lead[]> {
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
    
    // If a webhook URL is provided, send the lead data to the webhook
    if (webhookUrl && leadsToAssign && leadsToAssign.length > 0) {
      try {
        // Get venditore info from salespeople if available
        const { data: venditorInfo } = await supabase
          .from('venditori')
          .select('sheets_file_id, sheets_tab_name')
          .eq('nome', venditore)
          .single();
        
        const venditorData = {
          nome: venditore,
          sheets_file_id: venditorInfo?.sheets_file_id || '',
          sheets_tab_name: venditorInfo?.sheets_tab_name || ''
        };
        
        // Prepare data for webhook
        const assignmentData = {
          venditore: venditorData,
          leads: leadsToAssign.map(lead => ({
            nome: lead.nome,
            cognome: lead.cognome || '',
            email: lead.email || '',
            telefono: lead.telefono || '',
            created_at: lead.created_at,
            id: lead.id
          })),
          timestamp: new Date().toISOString(),
          campagna: campagna || ''
        };
        
        // Call the webhook edge function to send the data
        const response = await supabase.functions.invoke('lead-assign-webhook', {
          body: { assignmentData, webhookUrl }
        });
        
        if (response.error) {
          console.error("Error sending lead data to webhook:", response.error);
        } else {
          console.log("Lead data sent to webhook successfully:", response.data);
        }
      } catch (webhookError) {
        console.error("Error processing webhook for lead assignment:", webhookError);
        // Don't return error here, as the leads were successfully assigned in the database
      }
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

// Function to filter leads based on specified criteria
export async function filterLeads(table: string, filters: any) {
  try {
    // Use type assertion to work around TypeScript's strict type checking for dynamic table names
    type ValidTableName = "lead_generation" | "booked_call" | "lead_lavorati" | "lead_assignments" | "venditori" | "system_settings";
    
    let query = supabase.from(table as ValidTableName).select('*');

    // Apply text filters
    if (filters.nome) {
      query = query.ilike('nome', `%${filters.nome}%`);
    }
    
    if (filters.email) {
      query = query.ilike('email', `%${filters.email}%`);
    }
    
    if (filters.telefono) {
      query = query.ilike('telefono', `%${filters.telefono}%`);
    }
    
    if (filters.venditore) {
      query = query.ilike('venditore', `%${filters.venditore}%`);
    }
    
    if (filters.campagna && table === 'lead_generation') {
      query = query.ilike('campagna', `%${filters.campagna}%`);
    }
    
    if (filters.esito && table === 'lead_lavorati') {
      query = query.ilike('esito', `%${filters.esito}%`);
    }
    
    // Apply date filters
    if (filters.dataInizio) {
      // If it's the lead_lavorati table, filter on data_contatto
      if (table === 'lead_lavorati' && filters.dataInizio) {
        const dataInizio = new Date(filters.dataInizio);
        dataInizio.setHours(0, 0, 0, 0);
        query = query.gte('data_contatto', dataInizio.toISOString());
      } else {
        // Altrimenti filtra sulla data di creazione
        const dataInizio = new Date(filters.dataInizio);
        dataInizio.setHours(0, 0, 0, 0);
        query = query.gte('created_at', dataInizio.toISOString());
      }
    }
    
    if (filters.dataFine) {
      // If it's the lead_lavorati table, filter on data_contatto
      if (table === 'lead_lavorati' && filters.dataFine) {
        const dataFine = new Date(filters.dataFine);
        dataFine.setHours(23, 59, 59, 999);
        query = query.lte('data_contatto', dataFine.toISOString());
      } else {
        // Altrimenti filtra sulla data di creazione
        const dataFine = new Date(filters.dataFine);
        dataFine.setHours(23, 59, 59, 999);
        query = query.lte('created_at', dataFine.toISOString());
      }
    }

    // Sort results by creation date descending
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error fetching from ${table}:`, error);
      toast.error(`Errore nel recupero dei dati da ${table}`);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error(`Error filtering ${table}:`, error);
    toast.error(`Errore nel filtraggio dei dati da ${table}`);
    return [];
  }
}
