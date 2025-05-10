
import { markLeadsAsAssigned } from "./leadService";
import { supabase } from "@/integrations/supabase/client";

export interface LeadAssignmentData {
  numLead: number;
  venditore: string;
  campagna?: string;
}

export async function assignLeads(data: LeadAssignmentData): Promise<void> {
  try {
    // Mark the leads as assigned in our local database
    const assignedLeads = await markLeadsAsAssigned(data.numLead, data.venditore, data.campagna);
    
    if (assignedLeads.length < data.numLead) {
      throw new Error(`Solo ${assignedLeads.length} lead disponibili per l'assegnazione.`);
    }
    
    console.log("Lead assignment data:", data);
    console.log("Leads assigned:", assignedLeads);

    // In a production environment, you might want to call an Edge Function to
    // handle additional processing like updating Google Sheets
    // This would replace the commented out fetch code in the original implementation
    
    return Promise.resolve();
  } catch (error) {
    console.error("Error assigning leads:", error);
    throw error;
  }
}
