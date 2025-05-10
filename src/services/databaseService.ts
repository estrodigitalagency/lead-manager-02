
import { Lead } from "@/types/lead";

// This is a mock database for development purposes
// In production, this would be replaced with actual database calls
let mockLeadDatabase: Lead[] = [
  {
    id: "1",
    dataGenerazione: "2025-05-08",
    nome: "Marco",
    cognome: "Rossi",
    email: "marco.rossi@example.com",
    telefono: "3471234567",
    assegnato: false
  },
  {
    id: "2",
    dataGenerazione: "2025-05-08",
    nome: "Laura",
    cognome: "Bianchi",
    email: "laura.bianchi@example.com",
    telefono: "3487654321",
    assegnato: false
  },
  {
    id: "3",
    dataGenerazione: "2025-05-09",
    nome: "Giorgio",
    cognome: "Verdi",
    email: "giorgio.verdi@example.com",
    telefono: "3451122334",
    assegnato: false
  },
  {
    id: "4",
    dataGenerazione: "2025-05-09",
    nome: "Francesca",
    cognome: "Neri",
    email: "francesca.neri@example.com",
    telefono: "3499876543",
    assegnato: false
  },
  {
    id: "5",
    dataGenerazione: "2025-05-10",
    nome: "Antonio",
    cognome: "Esposito",
    email: "antonio.esposito@example.com",
    telefono: "3421234567",
    assegnato: false
  }
];

// Get all leads that haven't been assigned yet
export async function getUnassignedLeads(): Promise<Lead[]> {
  // In a real implementation, this would query a database
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
  return mockLeadDatabase.filter(lead => !lead.assegnato);
}

// Add a new lead (e.g. from webhook)
export async function addLead(lead: Omit<Lead, 'id' | 'assegnato'>): Promise<Lead> {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

  // Generate a simple ID (in a real app, this would be done by the database)
  const newLead: Lead = {
    ...lead,
    id: Date.now().toString(),
    assegnato: false
  };

  mockLeadDatabase.push(newLead);
  return newLead;
}

// Webhook handler to add leads
export async function processLeadWebhook(data: any): Promise<Lead> {
  // In a real implementation, this would verify the webhook payload
  // and transform it to match our Lead structure
  const newLead: Omit<Lead, 'id' | 'assegnato'> = {
    dataGenerazione: new Date().toISOString().split('T')[0],
    nome: data.nome || "",
    cognome: data.cognome || "",
    email: data.email || "",
    telefono: data.telefono || ""
  };

  return addLead(newLead);
}

// Mark leads as assigned
export async function markLeadsAsAssigned(numLeads: number, venditore: string, campagna?: string): Promise<Lead[]> {
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay

  // Get unassigned leads up to the requested number
  const leadsToAssign = mockLeadDatabase
    .filter(lead => !lead.assegnato)
    .slice(0, numLeads);

  // Mark them as assigned
  leadsToAssign.forEach(lead => {
    lead.assegnato = true;
    lead.venditore = venditore;
    lead.campagna = campagna;
  });

  return leadsToAssign;
}
