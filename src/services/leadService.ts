import { markLeadsAsAssigned } from "./databaseService";
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

    return Promise.resolve();
  } catch (error) {
    console.error("Error assigning leads:", error);
    throw error;
  }
}

/**
 * Checks the assignability status of leads based on booked call status
 * This function calls an RPC to update lead assignability
 */
export async function checkLeadsAssignability(): Promise<void> {
  try {
    // Call the RPC function without any parameters
    const { data, error } = await supabase.rpc('check_leads_assignability');

    if (error) {
      console.error("Error checking leads assignability:", error);
      throw error;
    }

    console.log("Leads assignability checked:", data);
    return Promise.resolve();
  } catch (error) {
    console.error("Error checking leads assignability:", error);
    throw error;
  }
}
