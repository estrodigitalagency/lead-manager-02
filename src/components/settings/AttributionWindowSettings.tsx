
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

export default function AttributionWindowSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [attributionDays, setAttributionDays] = useState(30);
  const [daysBeforeAssignable, setDaysBeforeAssignable] = useState(7);
  
  // Fetch current attribution window and days before assignable settings
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

        // Fetch days before assignable
        const { data: daysBeforeData, error: daysBeforeError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'days_before_assignable')
          .single();
          
        if (daysBeforeError && daysBeforeError.code !== 'PGRST116') {
          throw daysBeforeError;
        }
          
        if (daysBeforeData) {
          setDaysBeforeAssignable(parseInt(daysBeforeData.value));
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
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'booking_attribution_window_days');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('system_settings')
          .update({ value: attributionDays.toString() })
          .eq('key', 'booking_attribution_window_days');
          
        if (updateError) throw updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('system_settings')
          .insert({
            key: 'booking_attribution_window_days',
            value: attributionDays.toString(),
            descrizione: 'Numero di giorni per l\'attribuzione delle prenotazioni Calendly ai lead'
          });
          
        if (insertError) throw insertError;
      }
      
      toast.success("Impostazioni di attribuzione salvate con successo");
    } catch (error) {
      console.error("Error saving attribution window:", error);
      toast.error("Errore nel salvare le impostazioni di attribuzione");
    }
  };

  // Save days before assignable setting
  const saveDaysBeforeAssignable = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'days_before_assignable');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('system_settings')
          .update({ value: daysBeforeAssignable.toString() })
          .eq('key', 'days_before_assignable');
          
        if (updateError) throw updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('system_settings')
          .insert({
            key: 'days_before_assignable',
            value: daysBeforeAssignable.toString(),
            descrizione: 'Numero di giorni che devono passare prima che un lead sia assegnabile'
          });
          
        if (insertError) throw insertError;
      }
      
      toast.success("Timer minimo per l'assegnazione salvato con successo");
    } catch (error) {
      console.error("Error saving days before assignable:", error);
      toast.error("Errore nel salvare il timer minimo per l'assegnazione");
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
          <div className="grid gap-4">
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="attributionDays">Intervallo attribuzione call prenotata al lead (giorni)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-80">Determina per quanti giorni il sistema cercherà di associare una prenotazione Calendly a un lead esistente.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
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
              <div className="flex items-center gap-2">
                <Label htmlFor="daysBeforeAssignable">
                  Timer minimo per l'assegnazione (giorni)
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-80">Un lead sarà considerato assegnabile solo se non ha una chiamata prenotata E se sono passati almeno questi giorni dalla sua creazione. Può essere impostato a 0 per assegnazione immediata.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-4">
                <Input
                  id="daysBeforeAssignable"
                  type="number"
                  min="0"
                  max="365"
                  value={daysBeforeAssignable}
                  onChange={(e) => setDaysBeforeAssignable(parseInt(e.target.value) || 0)}
                  disabled={isLoading}
                />
                <Button onClick={saveDaysBeforeAssignable} disabled={isLoading}>
                  Salva
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
