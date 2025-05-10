
import { markLeadsAsAssigned } from "./databaseService";
import { supabase } from "@/integrations/supabase/client";

export interface LeadAssignmentData {
  numLead: number;
  venditore: string;
  campagna?: string;
  webhookUrl?: string;
}

export async function assignLeads(data: LeadAssignmentData): Promise<void> {
  try {
    // If no webhook URL was provided, try to get the default one from system settings
    let webhookUrl = data.webhookUrl;
    
    if (!webhookUrl) {
      // Get the default webhook URL from system settings
      const { data: webhookData, error: webhookError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'lead_assign_webhook_url')
        .single();
      
      if (!webhookError && webhookData && webhookData.value) {
        webhookUrl = webhookData.value;
      }
    }
    
    // Mark the leads as assigned in our local database
    const assignedLeads = await markLeadsAsAssigned(
      data.numLead, 
      data.venditore, 
      data.campagna, 
      webhookUrl
    );

    if (assignedLeads.length < data.numLead) {
      throw new Error(`Solo ${assignedLeads.length} lead disponibili per l'assegnazione.`);
    }

    console.log("Lead assignment data:", data);
    console.log("Leads assigned:", assignedLeads);

    return Promise.resolve();
  } catch (error) {
    console.error("Error assigning leads:", error);
    throw error;
  }
}
