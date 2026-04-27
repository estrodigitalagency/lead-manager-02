
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Venditore } from "@/types/venditore";

interface EditSalespersonDialogProps {
  venditore: Venditore;
  onUpdate: () => void;
}

const EditSalespersonDialog = ({ venditore, onUpdate }: EditSalespersonDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: venditore.nome,
    cognome: venditore.cognome,
    email: venditore.email || '',
    telefono: venditore.telefono || '',
    sheets_file_id: venditore.sheets_file_id,
    sheets_tab_name: venditore.sheets_tab_name,
    stato: venditore.stato
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim() || !formData.cognome.trim() || !formData.sheets_file_id.trim() || !formData.sheets_tab_name.trim()) {
      toast.error("Nome, cognome, Google Sheets ID File e Nome Tab sono obbligatori");
      return;
    }

    setIsSubmitting(true);

    try {
      const oldFullName = `${venditore.nome} ${venditore.cognome}`.trim();
      const newNome = formData.nome.trim();
      const newCognome = formData.cognome.trim();
      const newFullName = `${newNome} ${newCognome}`.trim();
      const nameChanged = oldFullName !== newFullName;

      const { error } = await supabase
        .from('venditori')
        .update({
          nome: newNome,
          cognome: newCognome,
          email: formData.email.trim() || null,
          telefono: formData.telefono.trim() || null,
          sheets_file_id: formData.sheets_file_id.trim(),
          sheets_tab_name: formData.sheets_tab_name.trim(),
          stato: formData.stato,
          updated_at: new Date().toISOString()
        })
        .eq('id', venditore.id);

      if (error) throw error;

      // Se nome o cognome sono cambiati, propaga il rename ai record denormalizzati
      // (lead_generation.venditore e assignment_history.venditore sono stringhe)
      if (nameChanged) {
        const { error: leadsError, count: leadsCount } = await supabase
          .from('lead_generation')
          .update({ venditore: newFullName }, { count: 'exact' })
          .eq('venditore', oldFullName);
        if (leadsError) console.error('Errore propagazione rename su lead_generation:', leadsError);

        const { error: histError, count: histCount } = await supabase
          .from('assignment_history')
          .update({ venditore: newFullName }, { count: 'exact' })
          .eq('venditore', oldFullName);
        if (histError) console.error('Errore propagazione rename su assignment_history:', histError);

        toast.success(
          `Venditore aggiornato. Rinominati ${leadsCount ?? 0} lead e ${histCount ?? 0} entry cronologia da "${oldFullName}" a "${newFullName}"`
        );
      } else {
        toast.success("Venditore aggiornato con successo");
      }

      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating venditore:", error);
      toast.error("Errore nell'aggiornamento del venditore");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifica Venditore</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cognome">Cognome *</Label>
              <Input
                id="cognome"
                value={formData.cognome}
                onChange={(e) => setFormData(prev => ({ ...prev, cognome: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Telefono</Label>
            <Input
              id="telefono"
              value={formData.telefono}
              onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
              placeholder="+39 123 456 7890"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheets_file_id">Google Sheets ID File *</Label>
            <Input
              id="sheets_file_id"
              value={formData.sheets_file_id}
              onChange={(e) => setFormData(prev => ({ ...prev, sheets_file_id: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheets_tab_name">Nome Tab *</Label>
            <Input
              id="sheets_tab_name"
              value={formData.sheets_tab_name}
              onChange={(e) => setFormData(prev => ({ ...prev, sheets_tab_name: e.target.value }))}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="stato"
              checked={formData.stato === 'attivo'}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, stato: checked ? 'attivo' : 'inattivo' }))
              }
            />
            <Label htmlFor="stato">Attivo</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Aggiornamento..." : "Aggiorna"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditSalespersonDialog;
