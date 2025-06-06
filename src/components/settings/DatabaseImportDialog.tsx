
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CSVFileUploader from "./import/CSVFileUploader";
import CSVHeaderMapper from "./import/CSVHeaderMapper";
import { parseCSVContent, getTableDisplayName, getInitialMappings } from "@/utils/csvUtils";

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
  
  // Reset state when dialog closes
  const handleClose = () => {
    setFile(null);
    setHeaders([]);
    setMappings({});
    setStep(1);
    setIsOpen(false);
  };
  
  // Handle file selection
  const handleFileChange = (selectedFile: File, csvHeaders: string[]) => {
    setFile(selectedFile);
    setHeaders(csvHeaders);
    
    // Initialize mappings
    const initialMappings = getInitialMappings(tableName, csvHeaders);
    setMappings(initialMappings);
    
    // Move to next step
    setStep(2);
  };
  
  // Import CSV data
  const importData = async () => {
    if (!file) return;
    
    setIsLoading(true);
    try {
      // Read file content
      const content = await file.text();
      const { records } = parseCSVContent(content, mappings);
      
      // Add default values if needed and process special fields
      const processedRecords = records.map(record => {
        const processedRecord = { ...record };
        
        if (tableName === 'lead_generation') {
          // Handle booked_call field - convert to proper format
          if (processedRecord.booked_call) {
            const bookedValue = processedRecord.booked_call.toLowerCase();
            processedRecord.booked_call = (bookedValue === 'si' || bookedValue === 'yes' || bookedValue === 'true' || bookedValue === '1') ? 'SI' : 'NO';
          } else {
            processedRecord.booked_call = 'NO';
          }
          
          // Handle created_at field - ensure proper date format
          if (processedRecord.created_at) {
            try {
              const date = new Date(processedRecord.created_at);
              if (!isNaN(date.getTime())) {
                processedRecord.created_at = date.toISOString();
              } else {
                delete processedRecord.created_at; // Let database use default
              }
            } catch {
              delete processedRecord.created_at; // Let database use default
            }
          }
        }
        
        return processedRecord;
      });
      
      // Insert records in batches
      const BATCH_SIZE = 50;
      for (let i = 0; i < processedRecords.length; i += BATCH_SIZE) {
        const batch = processedRecords.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from(tableName as any).insert(batch);
        if (error) throw error;
      }
      
      toast.success(`${processedRecords.length} record importati con successo`);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importa CSV in {getTableDisplayName(tableName)}</DialogTitle>
          <DialogDescription>
            Importa dati da un file CSV nel database
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {step === 1 && (
            <CSVFileUploader onFileChange={handleFileChange} />
          )}
          
          {step === 2 && (
            <CSVHeaderMapper 
              tableName={tableName}
              headers={headers}
              initialMappings={mappings}
              onMappingChange={setMappings}
            />
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
