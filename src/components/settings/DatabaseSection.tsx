
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, LinkIcon, Info, ArrowLeftRight, Plus, UploadCloud } from "lucide-react";
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

// Open Supabase table in a new tab
const openSupabaseTable = (table: string) => {
  window.open(`https://supabase.com/dashboard/project/btcwmuyemmkiteqlopce/editor/${table}`, "_blank");
};

export default function DatabaseSection() {
  const [activeDialogTable, setActiveDialogTable] = useState("");
  const [isAddRecordDialogOpen, setIsAddRecordDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
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
        { name: "created_at", type: "timestamp with time zone", nullable: false, default: "now()" },
        { name: "assignable", type: "boolean", nullable: true, default: "false" },
        { name: "venditore", type: "text", nullable: true, default: "-" },
        { name: "booked_call", type: "text", nullable: true, default: "NO" },
      ],
      webhookEndpoint: "https://btcwmuyemmkiteqlopce.functions.supabase.co/lead-generation-webhook"
    },
    {
      name: "Booked Call",
      tableName: "booked_call",
      description: "Database delle prenotazioni effettuate tramite Calendly",
      columns: [
        { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" },
        { name: "nome", type: "text", nullable: false, default: "-" },
        { name: "cognome", type: "text", nullable: false, default: "-" },
        { name: "email", type: "text", nullable: false, default: "-" },
        { name: "telefono", type: "text", nullable: false, default: "-" },
        { name: "created_at", type: "timestamp with time zone", nullable: false, default: "now()" },
        { name: "scheduled_at", type: "timestamp with time zone", nullable: false, default: "now()" },
        { name: "note", type: "text", nullable: true, default: "-" },
      ],
      webhookEndpoint: "https://btcwmuyemmkiteqlopce.functions.supabase.co/calendly-webhook"
    },
    {
      name: "Venditori",
      tableName: "venditori",
      description: "Database dei venditori e delle loro impostazioni",
      columns: [
        { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" },
        { name: "nome", type: "text", nullable: false, default: "-" },
        { name: "cognome", type: "text", nullable: false, default: "-" },
        { name: "email", type: "text", nullable: true, default: "-" },
        { name: "telefono", type: "text", nullable: true, default: "-" },
        { name: "lead_capacity", type: "integer", nullable: true, default: "50" },
        { name: "lead_attuali", type: "integer", nullable: true, default: "0" },
        { name: "sheets_file_id", type: "text", nullable: false, default: "-" },
        { name: "sheets_tab_name", type: "text", nullable: false, default: "-" },
        { name: "created_at", type: "timestamp with time zone", nullable: false, default: "now()" },
        { name: "updated_at", type: "timestamp with time zone", nullable: false, default: "now()" },
      ]
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
                          Webhook
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[650px]">
                        <DialogHeader>
                          <DialogTitle>Webhook {db.name}</DialogTitle>
                          <DialogDescription>
                            Endpoint per l'inserimento dei dati via webhook
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="py-4">
                          <Alert>
                            <AlertDescription className="text-sm font-mono break-all">
                              {db.webhookEndpoint}
                            </AlertDescription>
                          </Alert>
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
      <DatabaseAddRecordDialog 
        isOpen={isAddRecordDialogOpen}
        setIsOpen={setIsAddRecordDialogOpen}
        tableName={activeDialogTable}
      />
      
      {/* Import CSV Dialog */}
      <DatabaseImportDialog 
        isOpen={isImportDialogOpen}
        setIsOpen={setIsImportDialogOpen}
        tableName={activeDialogTable} 
      />
    </Card>
  );
}
