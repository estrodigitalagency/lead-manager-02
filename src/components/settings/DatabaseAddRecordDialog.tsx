import { useState, useEffect } from "react";
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
          { name: "fonte", label: "Fonte", required: false },
          { name: "booked_call", label: "Prenotazione Effettuata", required: false, default: "NO" },
          { name: "note", label: "Note", required: false },
        ];
      case "booked_call":
        return [
          { name: "nome", label: "Nome", required: true },
          { name: "cognome", label: "Cognome", required: true },
          { name: "email", label: "Email", required: true },
          { name: "telefono", label: "Telefono", required: true },
          { name: "fonte", label: "Fonte", required: false },
          { name: "scheduled_at", label: "Data Chiamata", required: true, type: "datetime-local" },
          { name: "note", label: "Note", required: false },
        ];
      case "system_settings":
        return [
          { name: "key", label: "Chiave", required: true },
          { name: "value", label: "Valore", required: true },
          { name: "descrizione", label: "Descrizione", required: false },
        ];
      case "lead_assignments":
        return [
          { name: "lead_id", label: "ID Lead", required: true },
          { name: "venditore_id", label: "ID Venditore", required: true },
          { name: "stato", label: "Stato", required: false, default: "attivo" },
        ];
      default:
        return [];
    }
  };
  
  // Reset form when dialog opens/closes or table changes
  useEffect(() => {
    if (isOpen) {
      const initialData: Record<string, string> = {};
      getTableFields().forEach(field => {
        initialData[field.name] = field.default || "";
      });
      setFormData(initialData);
    }
  }, [isOpen, tableName]);
  
  // Handle dialog close
  const handleClose = () => {
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
      // Type assertion must match the actual tables in the Supabase database
      const { error } = await supabase
        .from(tableName as "lead_generation" | "booked_call" | "lead_assignments" | "system_settings")
        .insert(formData);
      
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
  
  // Get table display name
  const getTableDisplayName = () => {
    switch (tableName) {
      case "lead_generation": return "Lead Generation";
      case "booked_call": return "Call Prenotate";
      case "system_settings": return "System Settings";
      case "lead_assignments": return "Lead Assignments";
      default: return tableName;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-card border-accent/30 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary">Aggiungi Record a {getTableDisplayName()}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Inserisci i dettagli per il nuovo record
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {getTableFields().map(field => (
            <div key={field.name} className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor={field.name} className="text-right text-foreground">
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id={field.name}
                name={field.name}
                className="col-span-3 input-neon"
                value={formData[field.name] || ""}
                onChange={handleChange}
                required={field.required}
                type={field.type || "text"}
              />
            </div>
          ))}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="border-accent/30 hover:bg-secondary">Annulla</Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="btn-neon">
            {isLoading ? "Salvataggio..." : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
