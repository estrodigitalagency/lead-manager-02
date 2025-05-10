
import { markLeadsAsAssigned } from "./databaseService";

export interface LeadAssignmentData {
  numLead: number;
  venditore: string;
  campagna?: string;
}

export async function assignLeads(data: LeadAssignmentData): Promise<void> {
  // Replace WEB_APP_ID with the actual Web App ID in production
  const endpoint = "https://script.google.com/macros/s/WEB_APP_ID/exec";
  
  try {
    // First, mark the leads as assigned in our local database
    const assignedLeads = await markLeadsAsAssigned(data.numLead, data.venditore, data.campagna);
    
    if (assignedLeads.length < data.numLead) {
      throw new Error(`Solo ${assignedLeads.length} lead disponibili per l'assegnazione.`);
    }
    
    // In development, we'll simulate a successful response
    // In production, uncomment the fetch code below and replace the endpoint
    
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // For development/demo only - simulate success
    console.log("Lead assignment data:", data);
    console.log("Leads assigned:", assignedLeads);
    return Promise.resolve();
    
    /* 
    // Production code
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        leads: assignedLeads.map(lead => lead.id)
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    */
  } catch (error) {
    console.error("Error assigning leads:", error);
    throw error;
  }
}
