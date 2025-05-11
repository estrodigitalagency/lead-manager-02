
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatabaseAddLavoratiDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  tableName: string;
}

export default function DatabaseAddLavoratiDialog({
  isOpen,
  setIsOpen,
  tableName,
}: DatabaseAddLavoratiDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Reset form when dialog opens/closes or table changes
  useEffect(() => {
    if (isOpen) {
      setFormData({});
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

  // Handle date selection
  const handleDateSelect = (field: string, date: Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: date
    }));
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    // Nome è obbligatorio
    if (!formData.nome) {
      toast.error("Il campo Nome è obbligatorio");
      return;
    }
    
    setIsLoading(true);
    try {
      // Formatta le date se presenti
      const dataToSubmit = {
        ...formData,
        data_call: formData.data_call ? formData.data_call.toISOString() : null,
        data_contatto: formData.data_contatto ? formData.data_contatto.toISOString() : null,
      };
      
      const { error } = await supabase
        .from(tableName)
        .insert(dataToSubmit);
      
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
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi Lead Lavorato</DialogTitle>
          <DialogDescription>
            Inserisci i dettagli per il nuovo lead lavorato
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="nome" className="text-right">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nome"
              name="nome"
              className="col-span-3"
              value={formData.nome || ""}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="cognome" className="text-right">
              Cognome
            </Label>
            <Input
              id="cognome"
              name="cognome"
              className="col-span-3"
              value={formData.cognome || ""}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              className="col-span-3"
              value={formData.email || ""}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="telefono" className="text-right">
              Telefono
            </Label>
            <Input
              id="telefono"
              name="telefono"
              className="col-span-3"
              value={formData.telefono || ""}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="venditore" className="text-right">
              Venditore
            </Label>
            <Input
              id="venditore"
              name="venditore"
              className="col-span-3"
              value={formData.venditore || ""}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="esito" className="text-right">
              Esito
            </Label>
            <Input
              id="esito"
              name="esito"
              className="col-span-3"
              value={formData.esito || ""}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-2">
            <Label htmlFor="obiezioni" className="text-right">
              Obiezioni
            </Label>
            <Input
              id="obiezioni"
              name="obiezioni"
              className="col-span-3"
              value={formData.obiezioni || ""}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-2">
            <Label className="text-right">
              Data Call
            </Label>
            <div className="col-span-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.data_call && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.data_call ? format(formData.data_call, "dd/MM/yyyy") : <span>Seleziona data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.data_call}
                    onSelect={(date) => handleDateSelect('data_call', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-2">
            <Label className="text-right">
              Data Contatto
            </Label>
            <div className="col-span-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.data_contatto && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.data_contatto ? format(formData.data_contatto, "dd/MM/yyyy") : <span>Seleziona data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.data_contatto}
                    onSelect={(date) => handleDateSelect('data_contatto', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
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
