
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NewVenditoreForm } from "@/types/venditore";

interface AddSalespersonFormProps {
  onSuccess: () => void;
}

const AddSalespersonForm = ({ onSuccess }: AddSalespersonFormProps) => {
  const [newVenditore, setNewVenditore] = useState<NewVenditoreForm>({
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    sheets_file_id: '',
    sheets_tab_name: ''
  });

  const handleAddVenditore = async () => {
    if (!newVenditore.nome.trim()) {
      toast.error("Il nome è obbligatorio");
      return;
    }

    if (!newVenditore.sheets_file_id.trim()) {
      toast.error("L'ID del Google Sheets è obbligatorio");
      return;
    }

    if (!newVenditore.sheets_tab_name.trim()) {
      toast.error("Il nome del tab è obbligatorio");
      return;
    }

    try {
      const { error } = await supabase
        .from('venditori')
        .insert([{
          nome: newVenditore.nome.trim(),
          cognome: newVenditore.cognome.trim(),
          email: newVenditore.email.trim() || null,
          telefono: newVenditore.telefono.trim() || null,
          sheets_file_id: newVenditore.sheets_file_id.trim(),
          sheets_tab_name: newVenditore.sheets_tab_name.trim(),
          stato: 'attivo'
        }]);

      if (error) throw error;

      toast.success("Venditore aggiunto con successo");
      setNewVenditore({
        nome: '',
        cognome: '',
        email: '',
        telefono: '',
        sheets_file_id: '',
        sheets_tab_name: ''
      });
      onSuccess();
    } catch (error) {
      console.error("Error adding venditore:", error);
      toast.error("Errore nell'aggiunta del venditore");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Aggiungi Nuovo Venditore</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nome">Nome *</Label>
          <Input
            id="nome"
            value={newVenditore.nome}
            onChange={(e) => setNewVenditore(prev => ({ ...prev, nome: e.target.value }))}
            placeholder="Nome venditore"
          />
        </div>
        
        <div>
          <Label htmlFor="cognome">Cognome</Label>
          <Input
            id="cognome"
            value={newVenditore.cognome}
            onChange={(e) => setNewVenditore(prev => ({ ...prev, cognome: e.target.value }))}
            placeholder="Cognome venditore"
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={newVenditore.email}
            onChange={(e) => setNewVenditore(prev => ({ ...prev, email: e.target.value }))}
            placeholder="email@esempio.com"
          />
        </div>

        <div>
          <Label htmlFor="telefono">Telefono (con prefisso)</Label>
          <Input
            id="telefono"
            value={newVenditore.telefono}
            onChange={(e) => setNewVenditore(prev => ({ ...prev, telefono: e.target.value }))}
            placeholder="+39 123 456 7890"
          />
        </div>

        <div>
          <Label htmlFor="sheets_file_id">Google Sheets ID File *</Label>
          <Input
            id="sheets_file_id"
            value={newVenditore.sheets_file_id}
            onChange={(e) => setNewVenditore(prev => ({ ...prev, sheets_file_id: e.target.value }))}
            placeholder="1ABC...XYZ"
          />
        </div>

        <div>
          <Label htmlFor="sheets_tab_name">Nome Tab Google Sheets *</Label>
          <Input
            id="sheets_tab_name"
            value={newVenditore.sheets_tab_name}
            onChange={(e) => setNewVenditore(prev => ({ ...prev, sheets_tab_name: e.target.value }))}
            placeholder="Sheet1"
          />
        </div>
      </div>

      <Button onClick={handleAddVenditore} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Aggiungi Venditore
      </Button>
    </div>
  );
};

export default AddSalespersonForm;
