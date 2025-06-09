
import { markLeadsAsAssigned } from "./databaseService";
import { supabase } from "@/integrations/supabase/client";

export interface LeadAssignmentData {
  numLead: number;
  venditore: string;
  campagna?: string;
}

export async function assignLeads(data: LeadAssignmentData): Promise<void> {
  try {
    // Get the global webhook URL from system settings
    const { data: webhookData, error: webhookError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'lead_assign_webhook_url')
      .single();
    
    let webhookUrl = null;
    if (!webhookError && webhookData && webhookData.value) {
      webhookUrl = webhookData.value;
    }
    
    if (!webhookUrl) {
      throw new Error("Webhook URL non configurato nelle impostazioni");
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
    console.log("Using global webhook URL:", webhookUrl);

    return Promise.resolve();
  } catch (error) {
    console.error("Error assigning leads:", error);
    throw error;
  }
}
