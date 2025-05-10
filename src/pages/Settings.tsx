import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Database, Webhook, Link as LinkIcon, Info, ArrowLeftRight, Users, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lead } from "@/types/lead";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SalespeopleSettings from "@/components/SalespeopleSettings";

const Settings = () => {
  const { toast } = useToast();
  const [isTestingLead, setIsTestingLead] = useState(false);
  const [isTestingCalendly, setIsTestingCalendly] = useState(false);
  const [testLead, setTestLead] = useState<Partial<Lead>>({
    nome: "",
    cognome: "",
    email: "",
    telefono: "",
    campagna: "Test"
  });

  const [testCalendly, setTestCalendly] = useState({
    nome: "",
    cognome: "",
    email: "",
    telefono: ""
  });

  const handleLeadInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTestLead(prev => ({ ...prev, [name]: value }));
  };

  const handleCalendlyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTestCalendly(prev => ({ ...prev, [name]: value }));
  };

  const testLeadWebhook = async () => {
    setIsTestingLead(true);
    try {
      const response = await fetch("https://btcwmuyemmkiteqlopce.functions.supabase.co/lead-generation-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testLead)
      });
      
      if (response.ok) {
        toast({
          title: "Test riuscito!",
          description: "I dati di test sono stati inviati con successo.",
        });
      } else {
        const error = await response.text();
        throw new Error(error || "Errore durante l'invio del test");
      }
    } catch (error) {
      console.error("Errore webhook test:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Si è verificato un errore durante il test del webhook.",
      });
    } finally {
      setIsTestingLead(false);
    }
  };

  const testCalendlyWebhook = async () => {
    setIsTestingCalendly(true);
    try {
      const response = await fetch("https://btcwmuyemmkiteqlopce.functions.supabase.co/calendly-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testCalendly)
      });
      
      if (response.ok) {
        toast({
          title: "Test riuscito!",
          description: "I dati di test sono stati inviati con successo.",
        });
      } else {
        const error = await response.text();
        throw new Error(error || "Errore durante l'invio del test");
      }
    } catch (error) {
      console.error("Errore webhook calendly test:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Si è verificato un errore durante il test del webhook.",
      });
    } finally {
      setIsTestingCalendly(false);
    }
  };

  const openSupabaseTable = (table: string) => {
    window.open(`https://supabase.com/dashboard/project/btcwmuyemmkiteqlopce/editor/${table}`, "_blank");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Impostazioni</h1>
        </div>
        <Link to="/database">
          <Button variant="outline" className="flex items-center gap-2">
            <Database size={18} />
            Database Records
          </Button>
        </Link>
      </div>
      
      <Tabs defaultValue="webhooks" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="webhooks">
            <Webhook className="mr-2 h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="salespeople">
            <Users className="mr-2 h-4 w-4" />
            Venditori
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="mr-2 h-4 w-4" />
            Database
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="webhooks">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Lead Generation Webhook */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Generation Webhook</CardTitle>
                <CardDescription>
                  Endpoint per l'inserimento dei lead via webhook
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription className="text-sm font-mono break-all">
                      https://btcwmuyemmkiteqlopce.functions.supabase.co/lead-generation-webhook
                    </AlertDescription>
                  </Alert>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full mt-2 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Informazioni sul formato dati
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[650px]">
                      <DialogHeader>
                        <DialogTitle>Formato dati per Lead Generation Webhook</DialogTitle>
                        <DialogDescription>
                          Mappatura dei campi richiesti per l'inserimento nel database
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="py-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Campo webhook</TableHead>
                              <TableHead>Colonna database</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Richiesto</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>nome</TableCell>
                              <TableCell>nome</TableCell>
                              <TableCell>text</TableCell>
                              <TableCell>Sì</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>cognome</TableCell>
                              <TableCell>cognome</TableCell>
                              <TableCell>text</TableCell>
                              <TableCell>Sì</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>email</TableCell>
                              <TableCell>email</TableCell>
                              <TableCell>text</TableCell>
                              <TableCell>Sì</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>telefono</TableCell>
                              <TableCell>telefono</TableCell>
                              <TableCell>text</TableCell>
                              <TableCell>Sì</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>campagna</TableCell>
                              <TableCell>campagna</TableCell>
                              <TableCell>text</TableCell>
                              <TableCell>No</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>

                        <div className="mt-6">
                          <h4 className="font-semibold mb-2">Esempio JSON da inviare:</h4>
                          <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                            {JSON.stringify({
                              nome: "Mario",
                              cognome: "Rossi",
                              email: "mario.rossi@example.com",
                              telefono: "+39 123 456 7890",
                              campagna: "Facebook Ads"
                            }, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <div className="space-y-4 pt-4">
                    <h3 className="text-lg font-medium">Test Webhook</h3>
                    
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="leadNome">Nome</Label>
                        <Input 
                          id="leadNome" 
                          name="nome" 
                          value={testLead.nome} 
                          onChange={handleLeadInputChange}
                          placeholder="Nome" 
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="leadCognome">Cognome</Label>
                        <Input 
                          id="leadCognome" 
                          name="cognome" 
                          value={testLead.cognome} 
                          onChange={handleLeadInputChange}
                          placeholder="Cognome" 
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="leadEmail">Email</Label>
                        <Input 
                          id="leadEmail" 
                          name="email" 
                          type="email" 
                          value={testLead.email} 
                          onChange={handleLeadInputChange}
                          placeholder="email@esempio.com" 
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="leadTelefono">Telefono</Label>
                        <Input 
                          id="leadTelefono" 
                          name="telefono" 
                          value={testLead.telefono} 
                          onChange={handleLeadInputChange}
                          placeholder="+39 123 456 7890" 
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="leadCampagna">Campagna</Label>
                        <Input 
                          id="leadCampagna" 
                          name="campagna" 
                          value={testLead.campagna} 
                          onChange={handleLeadInputChange}
                          placeholder="Nome campagna" 
                        />
                      </div>
                      
                      <Button 
                        className="w-full mt-2" 
                        onClick={testLeadWebhook}
                        disabled={isTestingLead}
                      >
                        {isTestingLead ? "Invio in corso..." : "Testa webhook"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Calendly Webhook */}
            <Card>
              <CardHeader>
                <CardTitle>Calendly Webhook</CardTitle>
                <CardDescription>
                  Endpoint per l'inserimento delle prenotazioni via webhook
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription className="text-sm font-mono break-all">
                      https://btcwmuyemmkiteqlopce.functions.supabase.co/calendly-webhook
                    </AlertDescription>
                  </Alert>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full mt-2 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Informazioni sul formato dati
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[650px]">
                      <DialogHeader>
                        <DialogTitle>Formato dati per Calendly Webhook</DialogTitle>
                        <DialogDescription>
                          Mappatura dei campi richiesti per l'inserimento nel database
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="py-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Campo webhook</TableHead>
                              <TableHead>Colonna database</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Richiesto</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>nome</TableCell>
                              <TableCell>nome</TableCell>
                              <TableCell>text</TableCell>
                              <TableCell>Sì</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>cognome</TableCell>
                              <TableCell>cognome</TableCell>
                              <TableCell>text</TableCell>
                              <TableCell>Sì</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>email</TableCell>
                              <TableCell>email</TableCell>
                              <TableCell>text</TableCell>
                              <TableCell>Sì</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>telefono</TableCell>
                              <TableCell>telefono</TableCell>
                              <TableCell>text</TableCell>
                              <TableCell>Sì</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>

                        <div className="mt-6">
                          <h4 className="font-semibold mb-2">Esempio JSON da inviare:</h4>
                          <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                            {JSON.stringify({
                              nome: "Mario",
                              cognome: "Rossi",
                              email: "mario.rossi@example.com",
                              telefono: "+39 123 456 7890"
                            }, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <div className="space-y-4 pt-4">
                    <h3 className="text-lg font-medium">Test Webhook</h3>
                    
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="calendlyNome">Nome</Label>
                        <Input 
                          id="calendlyNome" 
                          name="nome" 
                          value={testCalendly.nome} 
                          onChange={handleCalendlyInputChange}
                          placeholder="Nome" 
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="calendlyCognome">Cognome</Label>
                        <Input 
                          id="calendlyCognome" 
                          name="cognome" 
                          value={testCalendly.cognome} 
                          onChange={handleCalendlyInputChange}
                          placeholder="Cognome" 
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="calendlyEmail">Email</Label>
                        <Input 
                          id="calendlyEmail" 
                          name="email" 
                          type="email" 
                          value={testCalendly.email} 
                          onChange={handleCalendlyInputChange}
                          placeholder="email@esempio.com" 
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="calendlyTelefono">Telefono</Label>
                        <Input 
                          id="calendlyTelefono" 
                          name="telefono" 
                          value={testCalendly.telefono} 
                          onChange={handleCalendlyInputChange}
                          placeholder="+39 123 456 7890" 
                        />
                      </div>
                      
                      <Button 
                        className="w-full mt-2" 
                        onClick={testCalendlyWebhook}
                        disabled={isTestingCalendly}
                      >
                        {isTestingCalendly ? "Invio in corso..." : "Testa webhook"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="salespeople">
          <Card>
            <CardHeader>
              <CardTitle>Gestione Venditori</CardTitle>
              <CardDescription>
                Configura i dati dei venditori e le loro impostazioni di Google Sheets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalespeopleSettings />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="database">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Database</CardTitle>
                <CardDescription>
                  Visualizza e gestisci i database dell'applicazione
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center">
                          <Database className="h-5 w-5 mr-2" />
                          <h3 className="text-lg font-medium">Lead Generation</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Database dei lead generati attraverso il form di contatto
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          <Button 
                            variant="secondary" 
                            onClick={() => openSupabaseTable("lead_generation")}
                            className="flex items-center"
                          >
                            <Link className="mr-2 h-4 w-4" />
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
                                      <TableCell>data_generazione</TableCell>
                                      <TableCell>timestamp with time zone</TableCell>
                                      <TableCell>No</TableCell>
                                      <TableCell>now()</TableCell>
                                    </TableRow>
                                    <TableRow>
                                      <TableCell>assegnato</TableCell>
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
                                  </TableBody>
                                </Table>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="border p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center">
                          <Database className="h-5 w-5 mr-2" />
                          <h3 className="text-lg font-medium">Booked Call Calendly</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Database delle prenotazioni effettuate tramite Calendly
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          <Button 
                            variant="secondary"
                            onClick={() => openSupabaseTable("booked_call_calendly")}
                            className="flex items-center"
                          >
                            <Link className="mr-2 h-4 w-4" />
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
                                <DialogTitle>Struttura tabella Booked Call Calendly</DialogTitle>
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
                                      <TableCell>data_generazione</TableCell>
                                      <TableCell>timestamp with time zone</TableCell>
                                      <TableCell>No</TableCell>
                                      <TableCell>now()</TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </Card>
                  </div>
                  
                  <div className="pt-4">
                    <Alert>
                      <AlertDescription>
                        <p className="mb-2">Per accedere direttamente al pannello di amministrazione di Supabase:</p>
                        <Button 
                          variant="outline" 
                          onClick={() => window.open("https://supabase.com/dashboard/project/btcwmuyemmkiteqlopce", "_blank")}
                          className="flex items-center"
                        >
                          <Link className="mr-2 h-4 w-4" />
                          Dashboard Supabase
                        </Button>
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
