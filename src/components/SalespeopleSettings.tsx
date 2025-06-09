
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Save, FileSpreadsheet, Webhook } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Venditore {
  id: string;
  nome: string;
  cognome: string;
  stato: 'attivo' | 'inattivo';
  delivery_method: 'sheets' | 'webhook';
  sheets_file_id?: string;
  sheets_tab_name?: string;
  webhook_url?: string;
  created_at: string;
}

const SalespeopleSettings = () => {
  const [venditori, setVenditori] = useState<Venditore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newVenditore, setNewVenditore] = useState({
    nome: '',
    cognome: '',
    delivery_method: 'webhook' as 'sheets' | 'webhook',
    sheets_file_id: '',
    sheets_tab_name: '',
    webhook_url: ''
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
        stato: item.stato as 'attivo' | 'inattivo',
        delivery_method: item.delivery_method as 'sheets' | 'webhook'
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

    if (newVenditore.delivery_method === 'sheets' && (!newVenditore.sheets_file_id || !newVenditore.sheets_tab_name)) {
      toast.error("Per Google Sheets sono richiesti File ID e Nome Tab");
      return;
    }

    if (newVenditore.delivery_method === 'webhook' && !newVenditore.webhook_url) {
      toast.error("Per Webhook è richiesto l'URL");
      return;
    }

    try {
      const { error } = await supabase
        .from('venditori')
        .insert([{
          nome: newVenditore.nome.trim(),
          cognome: newVenditore.cognome.trim(),
          stato: 'attivo',
          delivery_method: newVenditore.delivery_method,
          sheets_file_id: newVenditore.delivery_method === 'sheets' ? newVenditore.sheets_file_id : null,
          sheets_tab_name: newVenditore.delivery_method === 'sheets' ? newVenditore.sheets_tab_name : null,
          webhook_url: newVenditore.delivery_method === 'webhook' ? newVenditore.webhook_url : null
        }]);

      if (error) throw error;

      toast.success("Venditore aggiunto con successo");
      setNewVenditore({
        nome: '',
        cognome: '',
        delivery_method: 'webhook',
        sheets_file_id: '',
        sheets_tab_name: '',
        webhook_url: ''
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
    if (venditore.delivery_method === 'sheets' && (!venditore.sheets_file_id || !venditore.sheets_tab_name)) {
      toast.error("Per Google Sheets sono richiesti File ID e Nome Tab");
      return;
    }

    if (venditore.delivery_method === 'webhook' && !venditore.webhook_url) {
      toast.error("Per Webhook è richiesto l'URL");
      return;
    }

    try {
      const { error } = await supabase
        .from('venditori')
        .update({
          delivery_method: venditore.delivery_method,
          sheets_file_id: venditore.delivery_method === 'sheets' ? venditore.sheets_file_id : null,
          sheets_tab_name: venditore.delivery_method === 'sheets' ? venditore.sheets_tab_name : null,
          webhook_url: venditore.delivery_method === 'webhook' ? venditore.webhook_url : null
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
          <Label>Metodo di Consegna Lead</Label>
          <Select 
            value={newVenditore.delivery_method} 
            onValueChange={(value: 'sheets' | 'webhook') => 
              setNewVenditore(prev => ({ ...prev, delivery_method: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="webhook">
                <div className="flex items-center gap-2">
                  <Webhook className="h-4 w-4" />
                  Webhook Esterno
                </div>
              </SelectItem>
              <SelectItem value="sheets">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Google Sheets
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {newVenditore.delivery_method === 'webhook' && (
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
        )}

        {newVenditore.delivery_method === 'sheets' && (
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
        )}

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
                        {venditore.delivery_method === 'sheets' ? (
                          <>
                            <FileSpreadsheet className="h-3 w-3" />
                            Google Sheets
                          </>
                        ) : (
                          <>
                            <Webhook className="h-3 w-3" />
                            Webhook
                          </>
                        )}
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
                      <Label>Metodo di Consegna</Label>
                      <Select 
                        value={venditore.delivery_method} 
                        onValueChange={(value: 'sheets' | 'webhook') => {
                          setVenditori(prev => prev.map(v => 
                            v.id === venditore.id 
                              ? { ...v, delivery_method: value }
                              : v
                          ));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="webhook">
                            <div className="flex items-center gap-2">
                              <Webhook className="h-4 w-4" />
                              Webhook Esterno
                            </div>
                          </SelectItem>
                          <SelectItem value="sheets">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4" />
                              Google Sheets
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {venditore.delivery_method === 'webhook' && (
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
                    )}

                    {venditore.delivery_method === 'sheets' && (
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
                    )}

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
