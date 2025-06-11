
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Send, TestTube } from "lucide-react";

export default function WebhookTestSection() {
  const [isLoading, setIsLoading] = useState(false);
  const [testWebhookUrl, setTestWebhookUrl] = useState("");
  const [testResponse, setTestResponse] = useState("");

  const generateTestPayload = () => {
    return {
      venditore: "Mario",
      venditore_cognome: "Rossi",
      venditore_email: "mario.rossi@example.com",
      venditore_telefono: "+39 123 456 7890",
      google_sheets_file_id: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      google_sheets_tab_name: "Foglio1",
      campagna: "Campagna Test",
      leads_count: 2,
      timestamp: new Date().toISOString(),
      leads: [
        {
          id: "test-lead-1",
          nome: "Giovanni",
          cognome: "Bianchi",
          email: "giovanni.bianchi@example.com",
          telefono: "+39 321 654 9870",
          fonte: "Facebook Ads",
          created_at: new Date().toISOString(),
          assigned_at: new Date().toISOString()
        },
        {
          id: "test-lead-2",
          nome: "Maria",
          cognome: "Verdi",
          email: "maria.verdi@example.com",
          telefono: "+39 987 654 3210",
          fonte: "Google Ads",
          created_at: new Date().toISOString(),
          assigned_at: new Date().toISOString()
        }
      ]
    };
  };

  const testWebhook = async () => {
    if (!testWebhookUrl) {
      toast.error("Inserisci l'URL del webhook da testare");
      return;
    }

    if (!testWebhookUrl.startsWith('http')) {
      toast.error("L'URL del webhook deve iniziare con http:// o https://");
      return;
    }

    setIsLoading(true);
    setTestResponse("");

    try {
      console.log("Testing webhook with URL:", testWebhookUrl);
      
      const testPayload = generateTestPayload();
      console.log("Test payload:", testPayload);

      const { data: response, error } = await supabase.functions.invoke('lead-assign-webhook', {
        body: {
          assignmentData: testPayload,
          webhookUrl: testWebhookUrl
        }
      });

      if (error) {
        console.error('Test webhook error:', error);
        toast.error(`Errore nel test webhook: ${error.message}`);
        setTestResponse(`Errore: ${error.message}`);
      } else {
        console.log('Test webhook response:', response);
        toast.success('Test webhook completato con successo!');
        setTestResponse(JSON.stringify(response, null, 2));
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
      toast.error(`Errore nel test: ${errorMessage}`);
      setTestResponse(`Errore: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const useConfiguredWebhook = async () => {
    try {
      const { data: webhookData, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'lead_assign_webhook_url')
        .single();

      if (error || !webhookData?.value) {
        toast.error("Nessun webhook configurato nelle impostazioni");
        return;
      }

      setTestWebhookUrl(webhookData.value);
      toast.success("URL webhook caricato dalle impostazioni");
    } catch (error) {
      console.error("Error loading webhook URL:", error);
      toast.error("Errore nel caricamento dell'URL webhook");
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Test Webhook Assegnazione Lead
        </CardTitle>
        <CardDescription>
          Testa il webhook di assegnazione lead con dati di esempio per verificare che tutto funzioni correttamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-webhook-url">URL Webhook per Test</Label>
          <div className="flex gap-2">
            <Input
              id="test-webhook-url"
              placeholder="https://example.com/webhook"
              value={testWebhookUrl}
              onChange={(e) => setTestWebhookUrl(e.target.value)}
              className="font-mono"
            />
            <Button
              variant="outline"
              onClick={useConfiguredWebhook}
              disabled={isLoading}
            >
              Usa Configurato
            </Button>
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Dati di Test che verranno inviati:</h4>
          <pre className="text-sm bg-background p-3 rounded border overflow-auto max-h-40">
{JSON.stringify(generateTestPayload(), null, 2)}
          </pre>
        </div>

        <Button 
          onClick={testWebhook} 
          disabled={isLoading || !testWebhookUrl}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {isLoading ? "Invio in corso..." : "Invia Test Webhook"}
        </Button>

        {testResponse && (
          <div className="space-y-2">
            <Label>Risposta del Test:</Label>
            <Textarea
              value={testResponse}
              readOnly
              className="font-mono text-sm"
              rows={8}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
