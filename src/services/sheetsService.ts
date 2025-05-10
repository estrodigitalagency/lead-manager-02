
// Mock data for development
// To be replaced with real API calls to Edge Functions in production

export async function fetchSalespeople(): Promise<string[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  // Mock data for development
  return ["Marco Rossi", "Laura Bianchi", "Alessandro Verdi", "Giulia Neri"];
}

export async function fetchAssignmentHistory(): Promise<string[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1500));
  
  // Mock data for development
  return [
    "10/05/2025 - 3 lead assegnati a Marco Rossi (Campagna Facebook)",
    "10/05/2025 - 2 lead assegnati a Laura Bianchi (Campagna Instagram)",
    "09/05/2025 - 5 lead assegnati a Alessandro Verdi (Campagna Email)",
    "08/05/2025 - 2 lead assegnati a Giulia Neri (Campagna LinkedIn)",
    "07/05/2025 - 1 lead assegnato a Marco Rossi (Campagna Facebook)"
  ];
}

// In production, you would implement functions that call your Edge Functions
// to interact with Google Sheets or other external services
