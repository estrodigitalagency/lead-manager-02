
// This is a mock service that simulates fetching data from Google Sheets
// In a real-world implementation, you would use the Google Sheets API or
// a custom endpoint that accesses the sheet data

export async function fetchSalespeople(): Promise<string[]> {
  // For prototyping, we'll use mock data
  // In production, you would make an API call to fetch data from column H
  
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 800));
  
  // Sample salespeople data (would come from Google Sheets column H)
  return [
    "Mario Rossi",
    "Giuseppe Verdi",
    "Francesca Bianchi",
    "Alessandra Neri",
    "Roberto Russo"
  ];
}

export async function fetchAssignmentHistory(): Promise<string[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  // Sample history data (would come from Google Sheets column E)
  return [
    "10.05.24 - 15:30 - Assegnazione 5 lead a Mario Rossi",
    "10.05.24 - 14:22 - Assegnazione 3 lead a Giuseppe Verdi",
    "09.05.24 - 16:45 - Assegnazione 8 lead a Francesca Bianchi",
    "09.05.24 - 11:20 - Assegnazione 2 lead a Alessandra Neri",
    "08.05.24 - 17:10 - Assegnazione 6 lead a Roberto Russo",
    "08.05.24 - 10:05 - Assegnazione 4 lead a Mario Rossi",
    "07.05.24 - 15:30 - Assegnazione 7 lead a Giuseppe Verdi",
    "07.05.24 - 09:45 - Assegnazione 2 lead a Francesca Bianchi",
    "06.05.24 - 16:20 - Assegnazione 5 lead a Alessandra Neri",
    "06.05.24 - 11:40 - Assegnazione 3 lead a Roberto Russo"
  ];
}
