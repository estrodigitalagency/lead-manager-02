
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lead } from "@/types/lead";

interface EditLeadVenditoreDialogProps {
  lead: Lead;
  onUpdate: () => void;
}

const EditLeadVenditoreDialog = ({ lead, onUpdate }: EditLeadVenditoreDialogProps) => {
  const [open, setOpen] = useState(false);
  const [venditore, setVenditore] = useState(lead.venditore || '');
  const [salespeople, setSalespeople] = useState<{id: string; nome: string; cognome: string;}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSalespeople = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('venditori')
        .select('id, nome, cognome')
        .eq('stato', 'attivo')
        .order('nome');
      
      if (error) throw error;
      setSalespeople(data || []);
    } catch (error) {
      console.error("Error fetching salespeople:", error);
      toast.error("Errore nel caricamento venditori");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && salespeople.length === 0) {
      fetchSalespeople();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const updateData: Record<string, any> = {
        venditore: venditore || null,
        updated_at: new Date().toISOString()
      };

      // Se stiamo rimuovendo il venditore, rendi il lead di nuovo assegnabile
      if (!venditore) {
        updateData.assignable = true;
      }

      const { error } = await supabase
        .from('lead_generation')
        .update(updateData)
        .eq('id', lead.id);

      if (error) throw error;

      const message = venditore 
        ? `Lead assegnato a ${venditore}` 
        : "Lead reso disponibile per riassegnazione";
      
      toast.success(message);
      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating lead venditore:", error);
      toast.error("Errore nell'aggiornamento del venditore");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveVenditore = () => {
    setVenditore('');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifica Venditore</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Lead: {lead.nome} {lead.cognome}</Label>
            <Label className="text-sm text-muted-foreground">{lead.email}</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venditore">Venditore Assegnato</Label>
            <div className="flex gap-2">
              <Select value={venditore} onValueChange={setVenditore} disabled={isLoading}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={isLoading ? "Caricamento..." : "Seleziona venditore"} />
                </SelectTrigger>
                <SelectContent>
                  {salespeople.map((person) => {
                    const fullName = `${person.nome} ${person.cognome}`;
                    return (
                      <SelectItem key={person.id} value={fullName}>
                        {fullName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {venditore && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleRemoveVenditore}
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {!venditore && (
              <p className="text-sm text-muted-foreground">
                Rimuovendo il venditore, il lead tornerà disponibile per l'assegnazione
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || isLoading}>
              {isSubmitting ? "Aggiornamento..." : "Aggiorna"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditLeadVenditoreDialog;
