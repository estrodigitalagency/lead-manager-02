
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
    // Mark the leads as assigned in our local database
    const assignedLeads = await markLeadsAsAssigned(
      data.numLead, 
      data.venditore, 
      data.campagna, 
      data.webhookUrl
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
