
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface CSVHeaderMapperProps {
  tableName: string;
  headers: string[];
  initialMappings: Record<string, string>;
  onMappingChange: (mappings: Record<string, string>) => void;
}

export default function CSVHeaderMapper({ 
  tableName, 
  headers, 
  initialMappings, 
  onMappingChange 
}: CSVHeaderMapperProps) {
  const [mappings, setMappings] = useState<Record<string, string>>(initialMappings);
  
  // Get required fields for the selected table
  const getRequiredFields = () => {
    switch (tableName) {
      case "lead_generation":
        return [
          { name: "nome", label: "Nome" },
          { name: "cognome", label: "Cognome" },
          { name: "email", label: "Email" },
          { name: "telefono", label: "Telefono" },
          { name: "fonte", label: "Fonte" },
          { name: "ultima_fonte", label: "Ultima Fonte" },
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
  };

  // Handle mapping change
  const handleMappingChange = (fieldName: string, headerValue: string) => {
    const updatedMappings = {
      ...mappings,
      [fieldName]: headerValue
    };
    
    setMappings(updatedMappings);
    onMappingChange(updatedMappings);
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Mappa le colonne del CSV ai campi del database
        </AlertDescription>
      </Alert>
      
      <div className="space-y-3">
        {getRequiredFields().map(field => (
          <div key={field.name} className="grid grid-cols-2 items-center gap-2">
            <Label htmlFor={`mapping-${field.name}`} className="text-right">
              {field.label}
            </Label>
            <select
              id={`mapping-${field.name}`}
              className="border rounded px-2 py-1 w-full bg-background"
              value={mappings[field.name] || ''}
              onChange={(e) => handleMappingChange(field.name, e.target.value)}
            >
              <option value="">-- Seleziona --</option>
              {headers.map(header => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
