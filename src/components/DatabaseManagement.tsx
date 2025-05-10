import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link as LinkIcon, ArrowLeftRight, Plus, FileUp, Database } from "lucide-react";
import { importLeadsFromCSV, addLead } from "@/services/databaseService";
import { Lead } from "@/types/lead";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Interfaccia per gestire l'importazione CSV
interface CSVImportDialogProps {
  onImport: (data: any[]) => Promise<boolean>;
  mappingFields: string[];
  tableName: string;
}

const CSVImportDialog = ({ onImport, mappingFields, tableName }: CSVImportDialogProps) => {
  const [isImporting, setIsImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Parse CSV preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const csvContent = event.target.result as string;
          const lines = csvContent.split('\n');
          if (lines.length > 0) {
            // Get header columns
            const headers = lines[0].split(',').map(h => h.trim());
            setCsvColumns(headers);
            
            // Set default mapping (if header names match fields)
            const defaultMapping: Record<string, string> = {};
            headers.forEach(header => {
              if (mappingFields.includes(header)) {
                defaultMapping[header] = header;
              }
            });
            setMapping(defaultMapping);
            
            // Get preview data (first 5 rows)
            const previewData: Record<string, string>[] = [];
            for (let i = 1; i < Math.min(lines.length, 6); i++) {
              if (lines[i].trim() !== '') {
                const values = lines[i].split(',');
                const rowData: Record<string, string> = {};
                headers.forEach((header, index) => {
                  rowData[header] = values[index] ? values[index].trim() : '';
                });
                previewData.push(rowData);
              }
            }
            setCsvPreview(previewData);
          }
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleMappingChange = (csvColumn: string, dbField: string) => {
    setMapping(prev => ({
      ...prev,
      [dbField]: csvColumn
    }));
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const csvContent = event.target.result as string;
          const lines = csvContent.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          
          // Map and convert data
          const importData = [];
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            const values = lines[i].split(',');
            const rowData: Record<string, string> = {};
            
            // Map each required field from CSV to DB field using the mapping
            for (const dbField of mappingFields) {
              const csvColumn = mapping[dbField];
              if (csvColumn) {
                const columnIndex = headers.indexOf(csvColumn);
                if (columnIndex !== -1) {
                  rowData[dbField] = values[columnIndex] ? values[columnIndex].trim() : '';
                }
              }
            }
            
            if (Object.keys(rowData).length > 0) {
              importData.push(rowData);
            }
          }
          
          if (importData.length === 0) {
            toast.error("Nessun dato valido da importare");
            setIsImporting(false);
            return;
          }
          
          const success = await onImport(importData);
          if (success) {
            setIsOpen(false);
            setFile(null);
            setCsvColumns([]);
            setCsvPreview([]);
            setMapping({});
          }
        }
        setIsImporting(false);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Error importing CSV:", error);
      toast.error("Errore nell'importazione del CSV");
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <FileUp className="h-4 w-4" />
          Importa da CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importa dati da CSV - {tableName}</DialogTitle>
          <DialogDescription>
            Carica un file CSV e mappa le colonne ai campi del database
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="csvFile">Seleziona file CSV</Label>
            <Input 
              id="csvFile" 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange}
              className="flex h-10"
            />
          </div>
          
          {file && csvColumns.length > 0 && (
            <>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Mappatura campi</h4>
                <div className="space-y-2">
                  {mappingFields.map((field) => (
                    <div key={field} className="grid grid-cols-2 gap-2">
                      <Label htmlFor={`map-${field}`} className="flex items-center">
                        Campo DB: <span className="font-bold ml-1">{field}</span>
                      </Label>
                      <select
                        id={`map-${field}`}
                        value={mapping[field] || ''}
                        onChange={(e) => handleMappingChange(e.target.value, field)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      >
                        <option value="">-- Seleziona colonna CSV --</option>
                        {csvColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Anteprima dati (prime 5 righe)</h4>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {csvColumns.map((col) => (
                          <TableHead key={col}>{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvPreview.map((row, index) => (
                        <TableRow key={index}>
                          {csvColumns.map((col) => (
                            <TableCell key={col}>{row[col]}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={handleImport}
                  disabled={isImporting || Object.keys(mapping).length === 0}
                >
                  {isImporting ? "Importazione..." : "Importa dati"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente per aggiungere manualmente un record
interface AddRecordDialogProps {
  onAdd: (data: any) => Promise<any>;
  fields: Array<{name: string, label: string, type?: string}>;
  tableName: string;
}

const AddRecordDialog = ({ onAdd, fields, tableName }: AddRecordDialogProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isOpen, setIsOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      const result = await onAdd(formData);
      if (result) {
        toast.success("Record aggiunto con successo");
        setIsOpen(false);
        setFormData({});
      }
    } catch (error) {
      console.error("Error adding record:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Aggiungi Record
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiungi record - {tableName}</DialogTitle>
          <DialogDescription>
            Inserisci i dati per un nuovo record
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {fields.map((field) => (
            <div key={field.name} className="grid gap-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input 
                id={field.name}
                name={field.name}
                type={field.type || 'text'}
                value={formData[field.name] || ''}
                onChange={handleInputChange}
              />
            </div>
          ))}
          
          <div className="flex justify-end">
            <Button
              onClick={handleAdd}
              disabled={isAdding || Object.values(formData).some(v => !v)}
            >
              {isAdding ? "Aggiunta in corso..." : "Aggiungi"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DatabaseManagement = () => {
  const openSupabaseTable = (table: string) => {
    window.open(`https://supabase.com/dashboard/project/btcwmuyemmkiteqlopce/editor/${table}`, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestione Database</CardTitle>
        <CardDescription>
          Consulta e gestisci i database dell'applicazione
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="lead_generation">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lead_generation">Lead Generation</TabsTrigger>
            <TabsTrigger value="booked_call">Call Schedulate</TabsTrigger>
          </TabsList>
          
          <TabsContent value="lead_generation" className="space-y-4 pt-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="secondary" 
                onClick={() => openSupabaseTable("lead_generation")}
                className="flex items-center"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Apri su Supabase
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center">
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    Struttura tabella
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[650px]">
                  <DialogHeader>
                    <DialogTitle>Struttura tabella Lead Generation</DialogTitle>
                    <DialogDescription>
                      Informazioni sulla struttura della tabella nel database
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="py-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Colonna</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Nullable</TableHead>
                          <TableHead>Default</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>id</TableCell>
                          <TableCell>uuid</TableCell>
                          <TableCell>No</TableCell>
                          <TableCell>gen_random_uuid()</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>nome</TableCell>
                          <TableCell>text</TableCell>
                          <TableCell>No</TableCell>
                          <TableCell>-</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>cognome</TableCell>
                          <TableCell>text</TableCell>
                          <TableCell>No</TableCell>
                          <TableCell>-</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>email</TableCell>
                          <TableCell>text</TableCell>
                          <TableCell>No</TableCell>
                          <TableCell>-</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>telefono</TableCell>
                          <TableCell>text</TableCell>
                          <TableCell>No</TableCell>
                          <TableCell>-</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>campagna</TableCell>
                          <TableCell>text</TableCell>
                          <TableCell>Sì</TableCell>
                          <TableCell>-</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>created_at</TableCell>
                          <TableCell>timestamp with time zone</TableCell>
                          <TableCell>No</TableCell>
                          <TableCell>now()</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>assegnabile</TableCell>
                          <TableCell>boolean</TableCell>
                          <TableCell>Sì</TableCell>
                          <TableCell>false</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>venditore</TableCell>
                          <TableCell>text</TableCell>
                          <TableCell>Sì</TableCell>
                          <TableCell>-</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>booked_call</TableCell>
                          <TableCell>text</TableCell>
                          <TableCell>Sì</TableCell>
                          <TableCell>'NO'</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>
              
              <CSVImportDialog 
                onImport={importLeadsFromCSV}
                mappingFields={['nome', 'cognome', 'email', 'telefono', 'campagna']}
                tableName="Lead Generation"
              />
              
              <AddRecordDialog 
                onAdd={addLead}
                fields={[
                  { name: 'nome', label: 'Nome' },
                  { name: 'cognome', label: 'Cognome' },
                  { name: 'email', label: 'Email', type: 'email' },
                  { name: 'telefono', label: 'Telefono' },
                  { name: 'campagna', label: 'Campagna' }
                ]}
                tableName="Lead Generation"
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Webhook URL</h3>
              <div className="bg-muted p-3 rounded-md">
                <code className="text-sm break-all">
                  https://btcwmuyemmkiteqlopce.functions.supabase.co/lead-generation-webhook
                </code>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="booked_call" className="space-y-4 pt-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="secondary"
                onClick={() => openSupabaseTable("booked_call_calendly")}
                className="flex items-center"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Apri su Supabase
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center">
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    Struttura tabella
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[650px]">
                  <DialogHeader>
                    <DialogTitle>Struttura tabella Call Schedulate</DialogTitle>
                    <DialogDescription>
                      Informazioni sulla struttura della tabella nel database
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="py-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Colonna</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Nullable</TableHead>
                          <TableHead>Default</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>id</TableCell>
                          <TableCell>uuid</TableCell>
                          <TableCell>No</TableCell>
                          <TableCell>gen_random_uuid()</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>nome</TableCell>
                          <TableCell>text</TableCell>
                          <TableCell>No</TableCell>
                          <TableCell>-</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>cognome</TableCell>
                          <TableCell>text</TableCell>
                          <TableCell>No</TableCell>
                          <TableCell>-</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>email</TableCell>
                          <TableCell>text</TableCell>
                          <TableCell>No</TableCell>
                          <TableCell>-</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>telefono</TableCell>
                          <TableCell>text</TableCell>
                          <TableCell>No</TableCell>
                          <TableCell>-</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>created_at</TableCell>
                          <TableCell>timestamp with time zone</TableCell>
                          <TableCell>No</TableCell>
                          <TableCell>now()</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>
              
              <CSVImportDialog 
                onImport={async (data) => {
                  try {
                    const { error } = await supabase
                      .from('booked_call_calendly')
                      .insert(data);
                    
                    if (error) {
                      console.error("Error importing bookings:", error);
                      toast.error("Errore nell'importazione delle prenotazioni");
                      return false;
                    }
                    
                    toast.success(`${data.length} prenotazioni importate con successo`);
                    return true;
                  } catch (error) {
                    console.error("Error importing bookings:", error);
                    toast.error("Errore nell'importazione delle prenotazioni");
                    return false;
                  }
                }}
                mappingFields={['nome', 'cognome', 'email', 'telefono']}
                tableName="Call Schedulate"
              />
              
              <AddRecordDialog 
                onAdd={async (data) => {
                  try {
                    const { error } = await supabase
                      .from('booked_call_calendly')
                      .insert([data]);
                    
                    if (error) {
                      console.error("Error adding booking:", error);
                      toast.error("Errore nell'aggiunta della prenotazione");
                      return null;
                    }
                    
                    return true;
                  } catch (error) {
                    console.error("Error adding booking:", error);
                    toast.error("Errore nell'aggiunta della prenotazione");
                    return null;
                  }
                }}
                fields={[
                  { name: 'nome', label: 'Nome' },
                  { name: 'cognome', label: 'Cognome' },
                  { name: 'email', label: 'Email', type: 'email' },
                  { name: 'telefono', label: 'Telefono' }
                ]}
                tableName="Call Schedulate"
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Webhook URL</h3>
              <div className="bg-muted p-3 rounded-md">
                <code className="text-sm break-all">
                  https://btcwmuyemmkiteqlopce.functions.supabase.co/calendly-webhook
                </code>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DatabaseManagement;
