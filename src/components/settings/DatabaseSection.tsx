
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, LinkIcon, Info, ArrowLeftRight, Plus, UploadCloud, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DatabaseImportDialog from "./DatabaseImportDialog";
import DatabaseAddRecordDialog from "./DatabaseAddRecordDialog";
import DatabaseAddLavoratiDialog from "./DatabaseAddLavoratiDialog";
import { toast } from "sonner";

// Open Supabase table in a new tab
const openSupabaseTable = (table: string) => {
  window.open(`https://supabase.com/dashboard/project/btcwmuyemmkiteqlopce/editor/${table}`, "_blank");
};

export default function DatabaseSection() {
  const [activeDialogTable, setActiveDialogTable] = useState("");
  const [isAddRecordDialogOpen, setIsAddRecordDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiato negli appunti!");
  };

  const leadGenerationExample = {
    nome: "Mario",
    cognome: "Rossi",
    email: "mario.rossi@email.com",
    telefono: "+39 123 456 7890",
    campagna: "Google Ads",
    fonte: "google, facebook",
    ultima_fonte: "facebook",
    lead_score: 85,
    venditore: "Giovanni Bianchi",
    stato: "assegnato",
    booked_call: "NO",
    market: "IT",
    note: "Interessato al prodotto X"
  };

  const calendlyBookingExample = {
    nome: "Luigi",
    cognome: "Verdi",
    email: "luigi.verdi@email.com",
    telefono: "+39 098 765 4321",
    fonte: "calendly, website",
    scheduled_at: "2024-01-15T14:30:00Z",
    market: "IT",
    note: "Chiamata di consulenza"
  };
  
  const databases = [
    {
      name: "Lead Generation",
      tableName: "lead_generation",
      description: "Database dei lead generati attraverso il form di contatto",
      columns: [
        { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" },
        { name: "nome", type: "text", nullable: false, default: "-" },
        { name: "cognome", type: "text", nullable: false, default: "-" },
        { name: "email", type: "text", nullable: false, default: "-" },
        { name: "telefono", type: "text", nullable: false, default: "-" },
        { name: "campagna", type: "text", nullable: true, default: "-" },
        { name: "fonte", type: "text", nullable: true, default: "-" },
        { name: "lead_score", type: "integer", nullable: true, default: "null" },
        { name: "created_at", type: "timestamp with time zone", nullable: false, default: "now()" },
        { name: "assignable", type: "boolean", nullable: true, default: "false" },
        { name: "venditore", type: "text", nullable: true, default: "-" },
        { name: "booked_call", type: "text", nullable: true, default: "NO" },
        { name: "ultima_fonte", type: "text", nullable: true, default: "null" },
      ],
      webhookEndpoint: "https://btcwmuyemmkiteqlopce.functions.supabase.co/lead-generation-webhook",
      webhookExample: leadGenerationExample,
      webhookFields: [
        { name: "nome", required: true, description: "Nome del lead" },
        { name: "cognome", required: false, description: "Cognome del lead" },
        { name: "email", required: true, description: "Email del lead" },
        { name: "telefono", required: true, description: "Numero di telefono" },
        { name: "campagna", required: false, description: "Nome della campagna pubblicitaria" },
        { name: "fonte", required: false, description: "Fonti del lead separate da virgola (es: google, facebook)" },
        { name: "lead_score", required: false, description: "Punteggio qualità del lead (numero da 0 a 100)" },
        { name: "venditore", required: false, description: "Nome del venditore assegnato (se già assegnato)" },
        { name: "stato", required: false, description: "Stato del lead (es: nuovo, assegnato, lavorato)" },
        { name: "booked_call", required: false, description: "\"SI\" o \"NO\" se ha prenotato una chiamata" },
        { name: "ultima_fonte", required: false, description: "Ultima fonte di acquisizione del lead (opzionale, se non specificata verrà calcolata automaticamente)" },
        { name: "market", required: false, description: "Mercato di riferimento: \"IT\" (Italia) o \"ES\" (Spagna). Default: \"IT\"" },
        { name: "note", required: false, description: "Note aggiuntive sul lead" }
      ]
    },
    {
      name: "Call Prenotate",
      tableName: "booked_call",
      description: "Database delle prenotazioni effettuate tramite Calendly",
      columns: [
        { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" },
        { name: "nome", type: "text", nullable: false, default: "-" },
        { name: "cognome", type: "text", nullable: false, default: "-" },
        { name: "email", type: "text", nullable: false, default: "-" },
        { name: "telefono", type: "text", nullable: false, default: "-" },
        { name: "fonte", type: "text", nullable: true, default: "-" },
        { name: "created_at", type: "timestamp with time zone", nullable: false, default: "now()" },
        { name: "scheduled_at", type: "timestamp with time zone", nullable: false, default: null },
        { name: "note", type: "text", nullable: true, default: "-" },
      ],
      webhookEndpoint: "https://btcwmuyemmkiteqlopce.functions.supabase.co/calendly-webhook",
      webhookExample: calendlyBookingExample,
      webhookFields: [
        { name: "nome", required: true, description: "Nome della persona" },
        { name: "cognome", required: false, description: "Cognome della persona" },
        { name: "email", required: true, description: "Email della persona" },
        { name: "telefono", required: true, description: "Numero di telefono" },
        { name: "fonte", required: false, description: "Fonti della prenotazione separate da virgola (es: calendly, website)" },
        { name: "scheduled_at", required: true, description: "Data e ora della chiamata (formato ISO 8601)" },
        { name: "market", required: false, description: "Mercato di riferimento: \"IT\" (Italia) o \"ES\" (Spagna). Default: \"IT\"" },
        { name: "note", required: false, description: "Note aggiuntive sulla prenotazione" }
      ]
    },
    {
      name: "Lead Lavorati",
      tableName: "lead_lavorati",
      description: "Database dei lead lavorati dai venditori",
      columns: [
        { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" },
        { name: "nome", type: "text", nullable: false, default: "-" },
        { name: "cognome", type: "text", nullable: true, default: "-" },
        { name: "email", type: "text", nullable: true, default: "-" },
        { name: "telefono", type: "text", nullable: true, default: "-" },
        { name: "venditore", type: "text", nullable: true, default: "-" },
        { name: "esito", type: "text", nullable: true, default: "-" },
        { name: "obiezioni", type: "text", nullable: true, default: "-" },
        { name: "data_call", type: "timestamp with time zone", nullable: true, default: null },
        { name: "data_contatto", type: "timestamp with time zone", nullable: true, default: null },
        { name: "created_at", type: "timestamp with time zone", nullable: false, default: "now()" },
      ],
      webhookEndpoint: null,
      webhookExample: null,
      webhookFields: []
    }
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Database</CardTitle>
        <CardDescription>
          Visualizza e gestisci i database dell'applicazione
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {databases.map((db) => (
            <Card key={db.tableName} className="border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Database className="h-5 w-5 mr-2" />
                    <CardTitle>{db.name}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => {
                        setActiveDialogTable(db.tableName);
                        setIsAddRecordDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Aggiungi Record</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => {
                        setActiveDialogTable(db.tableName);
                        setIsImportDialogOpen(true);
                      }}
                    >
                      <UploadCloud className="h-4 w-4" />
                      <span>Importa CSV</span>
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {db.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    variant="secondary" 
                    onClick={() => openSupabaseTable(db.tableName)}
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
                        <DialogTitle>Struttura tabella {db.name}</DialogTitle>
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
                            {db.columns.map((col) => (
                              <TableRow key={col.name}>
                                <TableCell>{col.name}</TableCell>
                                <TableCell>{col.type}</TableCell>
                                <TableCell>{col.nullable ? "Sì" : "No"}</TableCell>
                                <TableCell>{col.default}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {db.webhookEndpoint && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex items-center">
                          <Info className="mr-2 h-4 w-4" />
                          Struttura Webhook
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[750px]">
                        <DialogHeader>
                          <DialogTitle>Struttura Webhook {db.name}</DialogTitle>
                          <DialogDescription>
                            Endpoint e struttura dati per l'inserimento tramite webhook
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="py-4 space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">Endpoint URL:</h4>
                            <Alert>
                              <AlertDescription className="text-sm font-mono break-all">
                                {db.webhookEndpoint}
                              </AlertDescription>
                            </Alert>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2"
                              onClick={() => copyToClipboard(db.webhookEndpoint)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copia URL
                            </Button>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Esempio JSON:</h4>
                            <div className="bg-muted/30 p-4 rounded-lg border border-border/20">
                              <pre className="text-sm overflow-x-auto">
{JSON.stringify(db.webhookExample, null, 2)}
                              </pre>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2"
                                onClick={() => copyToClipboard(JSON.stringify(db.webhookExample, null, 2))}
                              >
                                <Copy className="h-4 w-4 mr-1" />
                                Copia esempio
                              </Button>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Campi supportati:</h4>
                            <div className="space-y-2">
                              {db.webhookFields.map((field) => (
                                <div key={field.name} className="flex items-start gap-2">
                                  <code className="bg-muted border border-border px-2 py-1 rounded text-sm text-foreground">
                                    {field.name}
                                  </code>
                                  <div className="text-sm">
                                    {field.required && <span className="text-destructive font-medium">Obbligatorio</span>}
                                    {!field.required && <span className="text-muted-foreground">Opzionale</span>}
                                    <span className="ml-2">{field.description}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Alert>
            <AlertDescription>
              <p className="mb-2">Per accedere direttamente al pannello di amministrazione di Supabase:</p>
              <a 
                href="https://supabase.com/dashboard/project/btcwmuyemmkiteqlopce" 
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button 
                  variant="outline" 
                  className="flex items-center"
                >
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Dashboard Supabase
                </Button>
              </a>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
      
      {/* Add Record Dialog */}
      {activeDialogTable === 'lead_lavorati' ? (
        <DatabaseAddLavoratiDialog 
          isOpen={isAddRecordDialogOpen}
          setIsOpen={setIsAddRecordDialogOpen}
          tableName={activeDialogTable}
        />
      ) : (
        <DatabaseAddRecordDialog 
          isOpen={isAddRecordDialogOpen}
          setIsOpen={setIsAddRecordDialogOpen}
          tableName={activeDialogTable}
        />
      )}
      
      {/* Import CSV Dialog */}
      <DatabaseImportDialog 
        isOpen={isImportDialogOpen}
        setIsOpen={setIsImportDialogOpen}
        tableName={activeDialogTable} 
      />
    </Card>
  );
}
