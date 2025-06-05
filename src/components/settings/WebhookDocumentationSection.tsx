
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Code, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function WebhookDocumentationSection() {
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
    fonte: "google",
    booked_call: "NO",
    note: "Interessato al prodotto X"
  };

  const calendlyBookingExample = {
    nome: "Luigi",
    cognome: "Verdi",
    email: "luigi.verdi@email.com",
    telefono: "+39 098 765 4321",
    fonte: "facebook",
    scheduled_at: "2024-01-15T14:30:00Z",
    note: "Chiamata di consulenza"
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Documentazione Webhook
        </CardTitle>
        <CardDescription>
          Come inviare dati a Lovable tramite webhook per inserire automaticamente lead e prenotazioni
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="lead-generation" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lead-generation">Lead Generation</TabsTrigger>
            <TabsTrigger value="calendly-booking">Prenotazioni Calendly</TabsTrigger>
          </TabsList>
          
          <TabsContent value="lead-generation" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Webhook Lead Generation</h3>
              <Alert className="mb-4">
                <AlertDescription className="font-mono text-sm break-all">
                  POST https://btcwmuyemmkiteqlopce.functions.supabase.co/lead-generation-webhook
                </AlertDescription>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => copyToClipboard("https://btcwmuyemmkiteqlopce.functions.supabase.co/lead-generation-webhook")}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copia URL
                </Button>
              </Alert>
              
              <div className="space-y-3">
                <h4 className="font-medium">Struttura dati JSON:</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{JSON.stringify(leadGenerationExample, null, 2)}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => copyToClipboard(JSON.stringify(leadGenerationExample, null, 2))}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copia esempio
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Campi supportati:</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li><code className="bg-gray-100 px-1 rounded">nome</code> - <strong>Obbligatorio</strong>: Nome del lead</li>
                    <li><code className="bg-gray-100 px-1 rounded">cognome</code> - Cognome del lead</li>
                    <li><code className="bg-gray-100 px-1 rounded">email</code> - <strong>Obbligatorio</strong>: Email del lead</li>
                    <li><code className="bg-gray-100 px-1 rounded">telefono</code> - <strong>Obbligatorio</strong>: Numero di telefono</li>
                    <li><code className="bg-gray-100 px-1 rounded">campagna</code> - Nome della campagna pubblicitaria</li>
                    <li><code className="bg-gray-100 px-1 rounded">fonte</code> - Fonte del lead (es: google, facebook, linkedin)</li>
                    <li><code className="bg-gray-100 px-1 rounded">booked_call</code> - "SI" o "NO" se ha prenotato una chiamata</li>
                    <li><code className="bg-gray-100 px-1 rounded">note</code> - Note aggiuntive sul lead</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="calendly-booking" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Webhook Prenotazioni Calendly</h3>
              <Alert className="mb-4">
                <AlertDescription className="font-mono text-sm break-all">
                  POST https://btcwmuyemmkiteqlopce.functions.supabase.co/calendly-webhook
                </AlertDescription>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => copyToClipboard("https://btcwmuyemmkiteqlopce.functions.supabase.co/calendly-webhook")}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copia URL
                </Button>
              </Alert>
              
              <div className="space-y-3">
                <h4 className="font-medium">Struttura dati JSON:</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{JSON.stringify(calendlyBookingExample, null, 2)}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => copyToClipboard(JSON.stringify(calendlyBookingExample, null, 2))}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copia esempio
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Campi supportati:</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li><code className="bg-gray-100 px-1 rounded">nome</code> - <strong>Obbligatorio</strong>: Nome della persona</li>
                    <li><code className="bg-gray-100 px-1 rounded">cognome</code> - Cognome della persona</li>
                    <li><code className="bg-gray-100 px-1 rounded">email</code> - <strong>Obbligatorio</strong>: Email della persona</li>
                    <li><code className="bg-gray-100 px-1 rounded">telefono</code> - <strong>Obbligatorio</strong>: Numero di telefono</li>
                    <li><code className="bg-gray-100 px-1 rounded">fonte</code> - Fonte della prenotazione (es: calendly, website)</li>
                    <li><code className="bg-gray-100 px-1 rounded">scheduled_at</code> - <strong>Obbligatorio</strong>: Data e ora della chiamata (formato ISO 8601)</li>
                    <li><code className="bg-gray-100 px-1 rounded">note</code> - Note aggiuntive sulla prenotazione</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <Alert className="mt-6">
          <AlertDescription>
            <strong>Importante:</strong> I webhook aggiorneranno automaticamente lo stato di assegnabilità dei lead.
            Le prenotazioni Calendly segneranno automaticamente i lead corrispondenti come "booked_call: SI" se trovano
            corrispondenze per email o telefono entro la finestra di attribuzione configurata.
          </AlertDescription>
        </Alert>
        
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open("https://supabase.com/dashboard/project/btcwmuyemmkiteqlopce/functions", "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Vedi Edge Functions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
