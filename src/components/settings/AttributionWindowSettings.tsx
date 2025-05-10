
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

export default function AttributionWindowSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [attributionDays, setAttributionDays] = useState(30);
  
  // Fetch current attribution window setting
  useEffect(() => {
    const fetchAttributionWindow = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'booking_attribution_window_days')
          .single();
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setAttributionDays(parseInt(data.value));
        }
      } catch (error) {
        console.error("Error fetching attribution window:", error);
        toast.error("Errore nel caricamento delle impostazioni di attribuzione");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAttributionWindow();
  }, []);
  
  // Save attribution window setting
  const saveAttributionWindow = async () => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'booking_attribution_window_days',
          value: attributionDays.toString(),
          description: 'Numero di giorni per l\'attribuzione delle prenotazioni Calendly ai lead'
        });
      
      if (error) throw error;
      
      toast.success("Impostazioni di attribuzione salvate con successo");
    } catch (error) {
      console.error("Error saving attribution window:", error);
      toast.error("Errore nel salvare le impostazioni di attribuzione");
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Finestre di Attribuzione</CardTitle>
        <CardDescription>
          Configura i parametri temporali per l'attribuzione delle prenotazioni ai lead
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              La finestra di attribuzione determina per quanto tempo una prenotazione può essere associata a un lead esistente.
              Se un contatto effettua una prenotazione tramite Calendly, il sistema cercherà di abbinare la prenotazione a un lead
              esistente creato entro il numero di giorni specificato.
            </AlertDescription>
          </Alert>
          
          <div className="grid gap-2">
            <Label htmlFor="attributionDays">Finestra di Attribuzione (giorni)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="attributionDays"
                type="number"
                min="1"
                max="365"
                value={attributionDays}
                onChange={(e) => setAttributionDays(parseInt(e.target.value) || 30)}
                disabled={isLoading}
              />
              <Button onClick={saveAttributionWindow} disabled={isLoading}>
                Salva
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
