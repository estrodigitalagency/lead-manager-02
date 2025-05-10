
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
  const [checkIntervalMinutes, setCheckIntervalMinutes] = useState(15);
  
  // Fetch current attribution window and check interval settings
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        // Fetch attribution window
        const { data: attributionData, error: attributionError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'booking_attribution_window_days')
          .single();
        
        if (attributionError && attributionError.code !== 'PGRST116') {
          throw attributionError;
        }
        
        if (attributionData) {
          setAttributionDays(parseInt(attributionData.value));
        }
        
        // Fetch check interval
        const { data: intervalData, error: intervalError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'lead_check_interval_minutes')
          .single();
        
        if (intervalError && intervalError.code !== 'PGRST116') {
          throw intervalError;
        }
        
        if (intervalData) {
          setCheckIntervalMinutes(parseInt(intervalData.value));
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("Errore nel caricamento delle impostazioni");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
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
  
  // Save check interval setting
  const saveCheckInterval = async () => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'lead_check_interval_minutes',
          value: checkIntervalMinutes.toString(),
          description: 'Intervallo in minuti per il controllo delle prenotazioni associate ai lead'
        });
      
      if (error) throw error;
      
      toast.success("Intervallo di controllo salvato con successo");
    } catch (error) {
      console.error("Error saving check interval:", error);
      toast.error("Errore nel salvare l'intervallo di controllo");
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
        <div className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              La finestra di attribuzione determina per quanto tempo una prenotazione può essere associata a un lead esistente.
              Se un contatto effettua una prenotazione tramite Calendly, il sistema cercherà di abbinare la prenotazione a un lead
              esistente creato entro il numero di giorni specificato.
            </AlertDescription>
          </Alert>
          
          <div className="grid gap-4">
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
            
            <div className="grid gap-2 mt-4">
              <Label htmlFor="checkIntervalMinutes">
                Intervallo di controllo prenotazioni (minuti)
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="checkIntervalMinutes"
                  type="number"
                  min="5"
                  max="1440"
                  value={checkIntervalMinutes}
                  onChange={(e) => setCheckIntervalMinutes(parseInt(e.target.value) || 15)}
                  disabled={isLoading}
                />
                <Button onClick={saveCheckInterval} disabled={isLoading}>
                  Salva
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Questo valore determina ogni quanti minuti il sistema controllerà se ci sono nuove prenotazioni
                associate ai lead nel database
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
