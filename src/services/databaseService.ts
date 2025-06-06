
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
      .is('venditore', null)
      .order('created_at', { ascending: false })
      .limit(1000);
    
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
    const isBooked = typeof lead.booked_call === 'string' 
      ? lead.booked_call === "SI" 
      : !!lead.booked_call;
    
    const leadToInsert = {
      ...lead,
      booked_call: isBooked ? 'SI' : 'NO',
      assignable: false
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
    
    try {
      await triggerLeadCheck();
    } catch (checkError) {
      console.error("Error checking lead assignability after adding:", checkError);
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
    
    const leadIds = leadsToAssign?.map(lead => lead.id) || [];
    
    if (leadIds.length === 0) {
      return [];
    }
    
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
    
    if (webhookUrl && leadsToAssign && leadsToAssign.length > 0) {
      try {
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
      }
    }
    
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
    
    toast.dismiss(toastId);
    toast.success(`Controllo completato: ${result.updated} lead aggiornati su ${result.checked} controllati`);
    return true;
  } catch (error) {
    console.error("Error triggering lead check:", error);
    toast.error("Errore nell'avvio del controllo dei lead");
    return false;
  }
}

// Type-safe function to filter leads based on specified criteria
export async function filterLeads(table: 'lead_generation' | 'booked_call' | 'lead_lavorati' | 'lead_assignments' | 'venditori' | 'system_settings', filters: any) {
  try {
    let query = supabase
      .from(table)
      .select('*')
      .limit(5000)
      .order('created_at', { ascending: false });

    if (filters.dataInizio) {
      const dataInizio = new Date(filters.dataInizio);
      dataInizio.setHours(0, 0, 0, 0);
      
      if (table === 'lead_lavorati') {
        query = query.gte('data_contatto', dataInizio.toISOString());
      } else {
        query = query.gte('created_at', dataInizio.toISOString());
      }
    }
    
    if (filters.dataFine) {
      const dataFine = new Date(filters.dataFine);
      dataFine.setHours(23, 59, 59, 999);
      
      if (table === 'lead_lavorati') {
        query = query.lte('data_contatto', dataFine.toISOString());
      } else {
        query = query.lte('created_at', dataFine.toISOString());
      }
    }

    if (filters.venditore) {
      query = query.eq('venditore', filters.venditore);
    }
    
    if (filters.campagna && table === 'lead_generation') {
      query = query.eq('campagna', filters.campagna);
    }
    
    if (filters.esito && table === 'lead_lavorati') {
      query = query.eq('esito', filters.esito);
    }
    
    if (filters.nome) {
      query = query.ilike('nome', `%${filters.nome}%`);
    }
    
    if (filters.email) {
      query = query.ilike('email', `%${filters.email}%`);
    }
    
    if (filters.telefono) {
      query = query.ilike('telefono', `%${filters.telefono}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error fetching from ${table}:`, error);
      toast.error(`Errore nel recupero dei dati da ${table}`);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error(`Error filtering ${table}:`, error);
    toast.error(`Errore nel filtraggio dei dati da ${table}`);
    return [];
  }
}

// Type-safe function for getting recent data without filters
export async function getRecentData(table: 'lead_generation' | 'booked_call' | 'lead_lavorati', limit: number = 1000) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error(`Error fetching recent data from ${table}:`, error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error(`Error fetching recent data from ${table}:`, error);
    return [];
  }
}

// Optimized function for getting counts only (for stats)
export async function getTableCounts() {
  try {
    const [totalLeads, assignableLeads, assignedLeads, bookedLeads] = await Promise.all([
      supabase.from('lead_generation').select('*', { count: 'exact', head: true }),
      supabase.from('lead_generation').select('*', { count: 'exact', head: true }).eq('assignable', true),
      supabase.from('lead_generation').select('*', { count: 'exact', head: true }).not('venditore', 'is', null),
      supabase.from('lead_generation').select('*', { count: 'exact', head: true }).eq('booked_call', 'SI')
    ]);
    
    return {
      total: totalLeads.count || 0,
      assignable: assignableLeads.count || 0,
      assigned: assignedLeads.count || 0,
      booked: bookedLeads.count || 0
    };
  } catch (error) {
    console.error("Error fetching table counts:", error);
    return {
      total: 0,
      assignable: 0,
      assigned: 0,
      booked: 0
    };
  }
}

// Optimized function for vendor statistics
export async function getVendorStats() {
  try {
    const { data: vendorLeads, error } = await supabase
      .from('lead_generation')
      .select('venditore')
      .not('venditore', 'is', null);
    
    if (error) {
      console.error("Error fetching vendor stats:", error);
      return [];
    }
    
    const vendorCounts: Record<string, number> = {};
    vendorLeads?.forEach(lead => {
      const vendorName = lead.venditore as string;
      if (vendorName) {
        vendorCounts[vendorName] = (vendorCounts[vendorName] || 0) + 1;
      }
    });
    
    return Object.entries(vendorCounts).map(([name, count]) => ({
      name,
      value: count
    }));
  } catch (error) {
    console.error("Error fetching vendor stats:", error);
    return [];
  }
}
