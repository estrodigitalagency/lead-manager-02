
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DatabaseAddRecordDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  tableName: string;
}

export default function DatabaseAddRecordDialog({
  isOpen,
  setIsOpen,
  tableName,
}: DatabaseAddRecordDialogProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Table schema mapping
  const getTableFields = () => {
    switch (tableName) {
      case "lead_generation":
        return [
          { name: "nome", label: "Nome", required: true },
          { name: "cognome", label: "Cognome", required: true },
          { name: "email", label: "Email", required: true },
          { name: "telefono", label: "Telefono", required: true },
          { name: "campagna", label: "Campagna", required: false },
          { name: "booked_call", label: "Prenotazione Effettuata", required: false, default: "NO" },
        ];
      case "booked_call_calendly":
        return [
          { name: "nome", label: "Nome", required: true },
          { name: "cognome", label: "Cognome", required: true },
          { name: "email", label: "Email", required: true },
          { name: "telefono", label: "Telefono", required: true },
        ];
      case "salespeople_settings":
        return [
          { name: "nome_venditore", label: "Nome Venditore", required: true },
          { name: "sheets_file_id", label: "ID File Google Sheets", required: true },
          { name: "sheets_tab_name", label: "Nome Tab Google Sheets", required: true },
        ];
      default:
        return [];
    }
  };
  
  // Reset form when dialog opens/closes or table changes
  const resetForm = () => {
    const initialData: Record<string, string> = {};
    getTableFields().forEach(field => {
      initialData[field.name] = field.default || "";
    });
    setFormData(initialData);
  };
  
  // Handle dialog close
  const handleClose = () => {
    resetForm();
    setIsOpen(false);
  };
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    // Validate required fields
    const fields = getTableFields();
    const missingFields = fields
      .filter(field => field.required && !formData[field.name])
      .map(field => field.label);
    
    if (missingFields.length > 0) {
      toast.error(`Campi obbligatori mancanti: ${missingFields.join(", ")}`);
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from(tableName)
        .insert([formData]);
      
      if (error) throw error;
      
      toast.success("Record aggiunto con successo");
      handleClose();
    } catch (error: any) {
      console.error("Error adding record:", error);
      toast.error(`Errore nell'aggiunta del record: ${error.message || "Errore sconosciuto"}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initialize form when dialog opens
  if (isOpen && Object.keys(formData).length === 0) {
    resetForm();
  }
  
  // Get table display name
  const getTableDisplayName = () => {
    switch (tableName) {
      case "lead_generation": return "Lead Generation";
      case "booked_call_calendly": return "Booked Call";
      case "salespeople_settings": return "Venditori";
      default: return tableName;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiungi Record a {getTableDisplayName()}</DialogTitle>
          <DialogDescription>
            Inserisci i dettagli per il nuovo record
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {getTableFields().map(field => (
            <div key={field.name} className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor={field.name} className="text-right">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id={field.name}
                name={field.name}
                className="col-span-3"
                value={formData[field.name] || ""}
                onChange={handleChange}
                required={field.required}
              />
            </div>
          ))}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Annulla</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Salvataggio..." : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
