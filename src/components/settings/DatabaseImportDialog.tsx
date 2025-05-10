
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

interface DatabaseImportDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  tableName: string;
}

export default function DatabaseImportDialog({
  isOpen,
  setIsOpen,
  tableName,
}: DatabaseImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  
  // Get required fields for the selected table
  const getRequiredFields = () => {
    switch (tableName) {
      case "lead_generation":
        return [
          { name: "nome", label: "Nome" },
          { name: "cognome", label: "Cognome" },
          { name: "email", label: "Email" },
          { name: "telefono", label: "Telefono" },
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
  
  // Get table display name
  const getTableDisplayName = () => {
    switch (tableName) {
      case "lead_generation": return "Lead Generation";
      case "booked_call_calendly": return "Booked Call";
      case "salespeople_settings": return "Venditori";
      default: return tableName;
    }
  };
  
  // Reset state when dialog closes
  const handleClose = () => {
    setFile(null);
    setHeaders([]);
    setMappings({});
    setStep(1);
    setIsOpen(false);
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Parse CSV headers
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          const lines = content.split('\n');
          if (lines.length > 0) {
            const csvHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            setHeaders(csvHeaders);
            
            // Initialize mappings
            const initialMappings: Record<string, string> = {};
            getRequiredFields().forEach(field => {
              // Try to find matching header
              const matchingHeader = csvHeaders.find(h => 
                h.toLowerCase() === field.name.toLowerCase() || 
                h.toLowerCase() === field.label.toLowerCase()
              );
              if (matchingHeader) {
                initialMappings[field.name] = matchingHeader;
              }
            });
            setMappings(initialMappings);
          }
        }
      };
      reader.readAsText(selectedFile);
      
      // Move to next step
      setStep(2);
    }
  };
  
  // Handle mapping change
  const handleMappingChange = (fieldName: string, headerValue: string) => {
    setMappings(prev => ({
      ...prev,
      [fieldName]: headerValue
    }));
  };
  
  // Import CSV data
  const importData = async () => {
    if (!file) return;
    
    setIsLoading(true);
    try {
      // Read file content
      const content = await file.text();
      const lines = content.split('\n').filter(line => line.trim());
      const csvHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Parse data rows
      const records: Record<string, any>[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const record: Record<string, any> = {};
        
        // Map values based on mappings
        Object.entries(mappings).forEach(([fieldName, headerName]) => {
          const headerIndex = csvHeaders.indexOf(headerName);
          if (headerIndex !== -1) {
            record[fieldName] = values[headerIndex] || '';
          }
        });
        
        // Add default values if needed
        if (tableName === 'lead_generation' && !record.hasOwnProperty('booked_call')) {
          record.booked_call = 'NO';
        }
        
        records.push(record);
      }
      
      // Insert records in batches
      const BATCH_SIZE = 50;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from(tableName as any).insert(batch);
        if (error) throw error;
      }
      
      toast.success(`${records.length} record importati con successo`);
      handleClose();
    } catch (error: any) {
      console.error("Error importing data:", error);
      toast.error(`Errore nell'importazione dei dati: ${error.message || "Errore sconosciuto"}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Importa CSV in {getTableDisplayName()}</DialogTitle>
          <DialogDescription>
            Importa dati da un file CSV nel database
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {step === 1 && (
            <div className="flex flex-col items-center gap-4">
              <Label htmlFor="csvFile" className="w-full text-center">
                Seleziona un file CSV
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 w-full flex flex-col items-center">
                <Upload className="h-10 w-10 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 mb-4">Trascina qui il file o clicca per sfogliare</p>
                <input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button onClick={() => document.getElementById('csvFile')?.click()}>
                  Seleziona File
                </Button>
              </div>
            </div>
          )}
          
          {step === 2 && (
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
                      className="border rounded px-2 py-1 w-full"
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
          )}
        </div>
        
        <DialogFooter>
          {step === 1 ? (
            <Button variant="outline" onClick={handleClose}>
              Annulla
            </Button>
          ) : step === 2 ? (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Indietro
              </Button>
              <Button onClick={importData} disabled={isLoading}>
                {isLoading ? "Importazione..." : "Importa"}
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
