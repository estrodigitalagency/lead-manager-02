
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Salesperson {
  id: string;
  nome: string;
  cognome: string;
  email?: string;
  telefono?: string;
  lead_capacity?: number;
  lead_attuali?: number;
  sheets_file_id: string;
  sheets_tab_name: string;
  stato?: string;
}

const SalespeopleSettings = () => {
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentSalesperson, setCurrentSalesperson] = useState<Salesperson | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    cognome: "",
    email: "",
    telefono: "",
    lead_capacity: 50,
    sheets_file_id: "",
    sheets_tab_name: ""
  });

  // Fetch salespeople from the database
  const fetchSalespeople = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("venditori")
        .select("*")
        .order("nome");

      if (error) throw error;
      setSalespeople(data || []);
    } catch (error) {
      console.error("Error fetching salespeople:", error);
      toast.error("Errore nel caricamento dei venditori");
    } finally {
      setIsLoading(false);
    }
  };

  // Load salespeople on component mount
  useEffect(() => {
    fetchSalespeople();
  }, []);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      nome: "",
      cognome: "",
      email: "",
      telefono: "",
      lead_capacity: 50,
      sheets_file_id: "",
      sheets_tab_name: ""
    });
  };

  // Add new salesperson
  const handleAddSalesperson = async () => {
    try {
      // Validate required fields
      if (!formData.nome) {
        toast.error("Il nome del venditore è obbligatorio");
        return;
      }
      
      if (!formData.cognome) {
        toast.error("Il cognome del venditore è obbligatorio");
        return;
      }
      
      if (!formData.sheets_file_id) {
        toast.error("L'ID del file Sheets è obbligatorio");
        return;
      }
      
      if (!formData.sheets_tab_name) {
        toast.error("Il nome del foglio Sheets è obbligatorio");
        return;
      }

      const { data, error } = await supabase
        .from("venditori")
        .insert([formData])
        .select();

      if (error) throw error;
      toast.success("Venditore aggiunto con successo");
      setIsAddDialogOpen(false);
      resetForm();
      fetchSalespeople();
    } catch (error: any) {
      console.error("Error adding salesperson:", error);
      toast.error(
        error.code === "23505"
          ? "Esiste già un venditore con questo nome"
          : "Errore nell'aggiunta del venditore"
      );
    }
  };

  // Edit salesperson
  const handleEditSalesperson = async () => {
    if (!currentSalesperson) return;
    
    // Validate required fields
    if (!formData.nome) {
      toast.error("Il nome del venditore è obbligatorio");
      return;
    }
    
    if (!formData.cognome) {
      toast.error("Il cognome del venditore è obbligatorio");
      return;
    }
    
    if (!formData.sheets_file_id) {
      toast.error("L'ID del file Sheets è obbligatorio");
      return;
    }
    
    if (!formData.sheets_tab_name) {
      toast.error("Il nome del foglio Sheets è obbligatorio");
      return;
    }

    try {
      const { error } = await supabase
        .from("venditori")
        .update({
          nome: formData.nome,
          cognome: formData.cognome,
          email: formData.email,
          telefono: formData.telefono,
          lead_capacity: formData.lead_capacity,
          sheets_file_id: formData.sheets_file_id,
          sheets_tab_name: formData.sheets_tab_name
        })
        .eq("id", currentSalesperson.id);

      if (error) throw error;
      toast.success("Venditore aggiornato con successo");
      setIsEditDialogOpen(false);
      setCurrentSalesperson(null);
      resetForm();
      fetchSalespeople();
    } catch (error: any) {
      console.error("Error updating salesperson:", error);
      toast.error(
        error.code === "23505"
          ? "Esiste già un venditore con questo nome"
          : "Errore nell'aggiornamento del venditore"
      );
    }
  };

  // Delete salesperson
  const handleDeleteSalesperson = async (id: string) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo venditore?")) return;

    try {
      const { error } = await supabase
        .from("venditori")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Venditore eliminato con successo");
      fetchSalespeople();
    } catch (error) {
      console.error("Error deleting salesperson:", error);
      toast.error("Errore nell'eliminazione del venditore");
    }
  };

  // Open edit dialog with salesperson data
  const openEditDialog = (salesperson: Salesperson) => {
    setCurrentSalesperson(salesperson);
    setFormData({
      nome: salesperson.nome,
      cognome: salesperson.cognome,
      email: salesperson.email || "",
      telefono: salesperson.telefono || "",
      lead_capacity: salesperson.lead_capacity || 50,
      sheets_file_id: salesperson.sheets_file_id,
      sheets_tab_name: salesperson.sheets_tab_name
    });
    setIsEditDialogOpen(true);
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-semibold">Gestione Venditori</CardTitle>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            size="sm"
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Aggiungi Venditore
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <span>Caricamento in corso...</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cognome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead>ID File Sheets</TableHead>
                  <TableHead>Nome Foglio</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salespeople.length > 0 ? (
                  salespeople.map((salesperson) => (
                    <TableRow key={salesperson.id}>
                      <TableCell className="font-medium">{salesperson.nome}</TableCell>
                      <TableCell>{salesperson.cognome}</TableCell>
                      <TableCell>{salesperson.email || "-"}</TableCell>
                      <TableCell>{salesperson.telefono || "-"}</TableCell>
                      <TableCell>
                        <div className="max-w-[150px] truncate" title={salesperson.sheets_file_id}>
                          {salesperson.sheets_file_id}
                        </div>
                      </TableCell>
                      <TableCell>{salesperson.sheets_tab_name}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditDialog(salesperson)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteSalesperson(salesperson.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <User size={24} className="text-gray-400" />
                        <p>Nessun venditore trovato.</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsAddDialogOpen(true)}
                        >
                          Aggiungi venditore
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi Nuovo Venditore</DialogTitle>
              <DialogDescription>
                Inserisci i dettagli per aggiungere un nuovo venditore
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="nome" className="text-right">
                  Nome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nome"
                  name="nome"
                  className="col-span-3"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="cognome" className="text-right">
                  Cognome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cognome"
                  name="cognome"
                  className="col-span-3"
                  value={formData.cognome}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  className="col-span-3"
                  value={formData.email}
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
                  value={formData.telefono}
                  onChange={handleChange}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="sheets_file_id" className="text-right">
                  ID File Sheets <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sheets_file_id"
                  name="sheets_file_id"
                  className="col-span-3"
                  value={formData.sheets_file_id}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="sheets_tab_name" className="text-right">
                  Nome Foglio <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sheets_tab_name"
                  name="sheets_tab_name"
                  className="col-span-3"
                  value={formData.sheets_tab_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleAddSalesperson}>Salva</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifica Venditore</DialogTitle>
              <DialogDescription>
                Modifica i dettagli del venditore
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit_nome" className="text-right">
                  Nome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_nome"
                  name="nome"
                  className="col-span-3"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit_cognome" className="text-right">
                  Cognome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_cognome"
                  name="cognome"
                  className="col-span-3"
                  value={formData.cognome}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit_email" className="text-right">
                  Email
                </Label>
                <Input
                  id="edit_email"
                  name="email"
                  type="email"
                  className="col-span-3"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit_telefono" className="text-right">
                  Telefono
                </Label>
                <Input
                  id="edit_telefono"
                  name="telefono"
                  className="col-span-3"
                  value={formData.telefono}
                  onChange={handleChange}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit_sheets_file_id" className="text-right">
                  ID File Sheets <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_sheets_file_id"
                  name="sheets_file_id"
                  className="col-span-3"
                  value={formData.sheets_file_id}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor="edit_sheets_tab_name" className="text-right">
                  Nome Foglio <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_sheets_tab_name"
                  name="sheets_tab_name"
                  className="col-span-3"
                  value={formData.sheets_tab_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleEditSalesperson}>Salva Modifiche</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SalespeopleSettings;
