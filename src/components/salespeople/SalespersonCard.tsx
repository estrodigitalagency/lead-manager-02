
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Venditore } from "@/types/venditore";

interface SalespersonCardProps {
  venditore: Venditore;
  onUpdate: () => void;
}

const SalespersonCard = ({ venditore, onUpdate }: SalespersonCardProps) => {
  const handleToggleStato = async (currentStato: 'attivo' | 'inattivo') => {
    const newStato = currentStato === 'attivo' ? 'inattivo' : 'attivo';
    
    try {
      const { error } = await supabase
        .from('venditori')
        .update({ stato: newStato })
        .eq('id', venditore.id);

      if (error) throw error;

      toast.success(`Venditore ${newStato === 'attivo' ? 'attivato' : 'disattivato'}`);
      onUpdate();
    } catch (error) {
      console.error("Error updating venditore status:", error);
      toast.error("Errore nell'aggiornamento dello stato");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Sei sicuro di voler eliminare questo venditore?")) return;

    try {
      const { error } = await supabase
        .from('venditori')
        .delete()
        .eq('id', venditore.id);

      if (error) throw error;

      toast.success("Venditore eliminato con successo");
      onUpdate();
    } catch (error) {
      console.error("Error deleting venditore:", error);
      toast.error("Errore nell'eliminazione del venditore");
    }
  };

  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h4 className="font-medium">
              {venditore.nome} {venditore.cognome}
            </h4>
            <Badge variant={venditore.stato === 'attivo' ? 'default' : 'secondary'}>
              {venditore.stato}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={venditore.stato === 'attivo'}
              onCheckedChange={() => handleToggleStato(venditore.stato)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground space-y-1">
          {venditore.email && <div>Email: {venditore.email}</div>}
          {venditore.telefono && <div>Telefono: {venditore.telefono}</div>}
          <div>Google Sheets ID: {venditore.sheets_file_id}</div>
          <div>Tab: {venditore.sheets_tab_name}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalespersonCard;
