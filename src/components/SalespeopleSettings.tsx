
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Venditore {
  id: string;
  nome: string;
  cognome: string;
  email?: string;
  telefono?: string;
  sheets_file_id: string;
  sheets_tab_name: string;
  stato: 'attivo' | 'inattivo';
  created_at: string;
}

const SalespeopleSettings = () => {
  const [venditori, setVenditori] = useState<Venditore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newVenditore, setNewVenditore] = useState({
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    sheets_file_id: '',
    sheets_tab_name: ''
  });

  useEffect(() => {
    fetchVenditori();
  }, []);

  const fetchVenditori = async () => {
    try {
      const { data, error } = await supabase
        .from('venditori')
        .select('id, nome, cognome, email, telefono, sheets_file_id, sheets_tab_name, stato, created_at')
        .order('nome');
      
      if (error) throw error;
      
      const typedData: Venditore[] = (data || []).map(item => ({
        ...item,
        stato: item.stato as 'attivo' | 'inattivo'
      }));
      
      setVenditori(typedData);
    } catch (error) {
      console.error("Error fetching venditori:", error);
      toast.error("Errore nel caricamento dei venditori");
    } finally {
      setIsLoading(false);
    }
  };

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
      fetchVenditori();
    } catch (error) {
      console.error("Error adding venditore:", error);
      toast.error("Errore nell'aggiunta del venditore");
    }
  };

  const handleToggleStato = async (id: string, currentStato: 'attivo' | 'inattivo') => {
    const newStato = currentStato === 'attivo' ? 'inattivo' : 'attivo';
    
    try {
      const { error } = await supabase
        .from('venditori')
        .update({ stato: newStato })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Venditore ${newStato === 'attivo' ? 'attivato' : 'disattivato'}`);
      fetchVenditori();
    } catch (error) {
      console.error("Error updating venditore status:", error);
      toast.error("Errore nell'aggiornamento dello stato");
    }
  };

  const handleDeleteVenditore = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo venditore?")) return;

    try {
      const { error } = await supabase
        .from('venditori')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Venditore eliminato con successo");
      fetchVenditori();
    } catch (error) {
      console.error("Error deleting venditore:", error);
      toast.error("Errore nell'eliminazione del venditore");
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Caricamento...</div>;
  }

  return (
    <CardContent className="space-y-6">
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

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Venditori Esistenti</h3>
        
        {venditori.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nessun venditore configurato
          </p>
        ) : (
          <div className="space-y-4">
            {venditori.map((venditore) => (
              <Card key={venditore.id} className="border">
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
                        onCheckedChange={() => handleToggleStato(venditore.id, venditore.stato)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVenditore(venditore.id)}
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
            ))}
          </div>
        )}
      </div>
    </CardContent>
  );
};

export default SalespeopleSettings;
