
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface WebhookInfoDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebhookInfoDialog({ isOpen, onOpenChange }: WebhookInfoDialogProps) {
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
    note: "Interessato al prodotto X",
    created_at: "2024-01-15T10:30:00Z"
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Struttura Webhook</DialogTitle>
          <DialogDescription>
            Struttura dati JSON per i webhook di lead generation e prenotazioni Calendly
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Lead Generation Webhook */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Webhook Lead Generation</h3>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-sm text-gray-600">POST</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard("https://btcwmuyemmkiteqlopce.functions.supabase.co/lead-generation-webhook")}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copia URL
                </Button>
              </div>
              <code className="text-xs break-all">
                https://btcwmuyemmkiteqlopce.functions.supabase.co/lead-generation-webhook
              </code>
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Esempio JSON:</h4>
              <div className="bg-slate-800 p-4 rounded-lg border relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-white hover:bg-slate-700"
                  onClick={() => copyToClipboard(JSON.stringify(leadGenerationExample, null, 2))}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <pre className="text-xs overflow-x-auto pr-12 text-green-400">
{JSON.stringify(leadGenerationExample, null, 2)}
                </pre>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Campi supportati:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div><code className="bg-gray-100 px-1 rounded">nome</code> - <strong>Obbligatorio</strong></div>
                <div><code className="bg-gray-100 px-1 rounded">cognome</code> - Opzionale</div>
                <div><code className="bg-gray-100 px-1 rounded">email</code> - <strong>Obbligatorio</strong></div>
                <div><code className="bg-gray-100 px-1 rounded">telefono</code> - <strong>Obbligatorio</strong></div>
                <div><code className="bg-gray-100 px-1 rounded">campagna</code> - Nome campagna</div>
                <div><code className="bg-gray-100 px-1 rounded">fonte</code> - Fonte lead</div>
                <div><code className="bg-gray-100 px-1 rounded">booked_call</code> - "SI" o "NO"</div>
                <div><code className="bg-gray-100 px-1 rounded">note</code> - Note aggiuntive</div>
                <div><code className="bg-gray-100 px-1 rounded">created_at</code> - Data creazione (ISO 8601)</div>
              </div>
            </div>
          </div>

          {/* Calendly Webhook */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Webhook Prenotazioni Calendly</h3>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-sm text-gray-600">POST</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard("https://btcwmuyemmkiteqlopce.functions.supabase.co/calendly-webhook")}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copia URL
                </Button>
              </div>
              <code className="text-xs break-all">
                https://btcwmuyemmkiteqlopce.functions.supabase.co/calendly-webhook
              </code>
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Esempio JSON:</h4>
              <div className="bg-slate-800 p-4 rounded-lg border relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-white hover:bg-slate-700"
                  onClick={() => copyToClipboard(JSON.stringify(calendlyBookingExample, null, 2))}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <pre className="text-xs overflow-x-auto pr-12 text-green-400">
{JSON.stringify(calendlyBookingExample, null, 2)}
                </pre>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Campi supportati:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div><code className="bg-gray-100 px-1 rounded">nome</code> - <strong>Obbligatorio</strong></div>
                <div><code className="bg-gray-100 px-1 rounded">cognome</code> - Opzionale</div>
                <div><code className="bg-gray-100 px-1 rounded">email</code> - <strong>Obbligatorio</strong></div>
                <div><code className="bg-gray-100 px-1 rounded">telefono</code> - <strong>Obbligatorio</strong></div>
                <div><code className="bg-gray-100 px-1 rounded">fonte</code> - Fonte prenotazione</div>
                <div><code className="bg-gray-100 px-1 rounded">scheduled_at</code> - <strong>Obbligatorio</strong> (ISO 8601)</div>
                <div><code className="bg-gray-100 px-1 rounded">note</code> - Note aggiuntive</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
