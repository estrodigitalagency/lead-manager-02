
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Save, Webhook } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Venditore {
  id: string;
  nome: string;
  cognome: string;
  stato: 'attivo' | 'inattivo';
  webhook_url?: string;
  sheets_file_id?: string;
  sheets_tab_name?: string;
  created_at: string;
}

const SalespeopleSettings = () => {
  const [venditori, setVenditori] = useState<Venditore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newVenditore, setNewVenditore] = useState({
    nome: '',
    cognome: '',
    webhook_url: '',
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
        .select('*')
        .order('nome');
      
      if (error) throw error;
      
      // Type cast the data to ensure stato is properly typed
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

    if (!newVenditore.webhook_url || !newVenditore.sheets_file_id || !newVenditore.sheets_tab_name) {
      toast.error("Webhook URL, Google Sheets File ID e Nome Tab sono tutti obbligatori");
      return;
    }

    try {
      const { error } = await supabase
        .from('venditori')
        .insert([{
          nome: newVenditore.nome.trim(),
          cognome: newVenditore.cognome.trim(),
          stato: 'attivo',
          delivery_method: 'webhook',
          webhook_url: newVenditore.webhook_url,
          sheets_file_id: newVenditore.sheets_file_id,
          sheets_tab_name: newVenditore.sheets_tab_name
        }]);

      if (error) throw error;

      toast.success("Venditore aggiunto con successo");
      setNewVenditore({
        nome: '',
        cognome: '',
        webhook_url: '',
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

  const handleUpdateVenditore = async (venditore: Venditore) => {
    if (!venditore.webhook_url || !venditore.sheets_file_id || !venditore.sheets_tab_name) {
      toast.error("Webhook URL, Google Sheets File ID e Nome Tab sono tutti obbligatori");
      return;
    }

    try {
      const { error } = await supabase
        .from('venditori')
        .update({
          webhook_url: venditore.webhook_url,
          sheets_file_id: venditore.sheets_file_id,
          sheets_tab_name: venditore.sheets_tab_name
        })
        .eq('id', venditore.id);

      if (error) throw error;
      toast.success("Impostazioni venditore aggiornate");
      fetchVenditori();
    } catch (error) {
      console.error("Error updating venditore:", error);
      toast.error("Errore nell'aggiornamento del venditore");
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
        </div>

        <div>
          <Label htmlFor="webhook_url">URL Webhook *</Label>
          <Input
            id="webhook_url"
            value={newVenditore.webhook_url}
            onChange={(e) => setNewVenditore(prev => ({ ...prev, webhook_url: e.target.value }))}
            placeholder="https://example.com/webhook"
            className="font-mono"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sheets_file_id">Google Sheets File ID *</Label>
            <Input
              id="sheets_file_id"
              value={newVenditore.sheets_file_id}
              onChange={(e) => setNewVenditore(prev => ({ ...prev, sheets_file_id: e.target.value }))}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              className="font-mono"
            />
          </div>
          
          <div>
            <Label htmlFor="sheets_tab_name">Nome Tab *</Label>
            <Input
              id="sheets_tab_name"
              value={newVenditore.sheets_tab_name}
              onChange={(e) => setNewVenditore(prev => ({ ...prev, sheets_tab_name: e.target.value }))}
              placeholder="Lead"
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
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">
                        {venditore.nome} {venditore.cognome}
                      </h4>
                      <Badge variant={venditore.stato === 'attivo' ? 'default' : 'secondary'}>
                        {venditore.stato}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Webhook className="h-3 w-3" />
                        Webhook
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

                  <div className="space-y-3">
                    <div>
                      <Label>URL Webhook</Label>
                      <Input
                        value={venditore.webhook_url || ''}
                        onChange={(e) => {
                          setVenditori(prev => prev.map(v => 
                            v.id === venditore.id 
                              ? { ...v, webhook_url: e.target.value }
                              : v
                          ));
                        }}
                        placeholder="https://example.com/webhook"
                        className="font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Google Sheets File ID</Label>
                        <Input
                          value={venditore.sheets_file_id || ''}
                          onChange={(e) => {
                            setVenditori(prev => prev.map(v => 
                              v.id === venditore.id 
                                ? { ...v, sheets_file_id: e.target.value }
                                : v
                            ));
                          }}
                          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                          className="font-mono"
                        />
                      </div>
                      
                      <div>
                        <Label>Nome Tab</Label>
                        <Input
                          value={venditore.sheets_tab_name || ''}
                          onChange={(e) => {
                            setVenditori(prev => prev.map(v => 
                              v.id === venditore.id 
                                ? { ...v, sheets_tab_name: e.target.value }
                                : v
                            ));
                          }}
                          placeholder="Lead"
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={() => handleUpdateVenditore(venditore)}
                      size="sm"
                      className="w-full"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salva Modifiche
                    </Button>
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
