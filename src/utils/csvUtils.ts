
interface CSVParsingResult {
  headers: string[];
  records: Record<string, string>[];
}

export function parseCSVContent(content: string, mappings: Record<string, string>): CSVParsingResult {
  const lines = content.split('\n').filter(line => line.trim());
  const csvHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  // Parse data rows
  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const record: Record<string, string> = {};
    
    // Map values based on mappings
    Object.entries(mappings).forEach(([fieldName, headerName]) => {
      const headerIndex = csvHeaders.indexOf(headerName);
      if (headerIndex !== -1) {
        record[fieldName] = values[headerIndex] || '';
      }
    });
    
    records.push(record);
  }
  
  return { headers: csvHeaders, records };
}

export function getInitialMappings(
  tableName: string, 
  headers: string[]
): Record<string, string> {
  const initialMappings: Record<string, string> = {};
  const requiredFields = getRequiredFieldsForTable(tableName);
  
  requiredFields.forEach(field => {
    // Try to find matching header
    const matchingHeader = headers.find(h => 
      h.toLowerCase() === field.name.toLowerCase() || 
      h.toLowerCase() === field.label.toLowerCase()
    );
    if (matchingHeader) {
      initialMappings[field.name] = matchingHeader;
    }
  });
  
  return initialMappings;
}

export function getRequiredFieldsForTable(tableName: string): { name: string; label: string }[] {
  switch (tableName) {
    case "lead_generation":
      return [
        { name: "nome", label: "Nome" },
        { name: "cognome", label: "Cognome" },
        { name: "email", label: "Email" },
        { name: "telefono", label: "Telefono" },
        { name: "fonte", label: "Fonte" },
        { name: "booked_call", label: "Call Prenotata" },
        { name: "created_at", label: "Data Creazione" },
      ];
    case "booked_call_calendly":
      return [
        { name: "nome", label: "Nome" },
        { name: "cognome", label: "Cognome" },
        { name: "email", label: "Email" },
        { name: "telefono", label: "Telefono" },
      ];
    case "salespeople_settings":
      return [
        { name: "nome_venditore", label: "Nome Venditore" },
        { name: "sheets_file_id", label: "ID File Google Sheets" },
        { name: "sheets_tab_name", label: "Nome Tab Google Sheets" },
      ];
    default:
      return [];
  }
}

export function getTableDisplayName(tableName: string): string {
  switch (tableName) {
    case "lead_generation": return "Lead Generation";
    case "booked_call_calendly": return "Booked Call";
    case "salespeople_settings": return "Venditori";
    default: return tableName;
  }
}
