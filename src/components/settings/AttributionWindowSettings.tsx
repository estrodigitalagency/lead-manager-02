
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Info, Save } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

export default function AttributionWindowSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [attributionDays, setAttributionDays] = useState(30);
  const [daysBeforeAssignable, setDaysBeforeAssignable] = useState(7);
  const [duplicateCheckValue, setDuplicateCheckValue] = useState(5);
  const [duplicateCheckUnit, setDuplicateCheckUnit] = useState('minutes');
  
  // Fetch all settings
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('key, value')
          .in('key', [
            'booking_attribution_window_days',
            'days_before_assignable',
            'duplicate_check_value',
            'duplicate_check_unit'
          ]);
        
        if (error) throw error;
        
        // Process the settings
        data?.forEach(setting => {
          switch (setting.key) {
            case 'booking_attribution_window_days':
              setAttributionDays(parseInt(setting.value) || 30);
              break;
            case 'days_before_assignable':
              setDaysBeforeAssignable(parseInt(setting.value) || 7);
              break;
            case 'duplicate_check_value':
              setDuplicateCheckValue(parseInt(setting.value) || 5);
              break;
            case 'duplicate_check_unit':
              setDuplicateCheckUnit(setting.value || 'minutes');
              break;
          }
        });
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("Errore nel caricamento delle impostazioni");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  // Save all settings
  const saveAllSettings = async () => {
    setIsSaving(true);
    try {
      const settingsToUpdate = [
        {
          key: 'booking_attribution_window_days',
          value: attributionDays.toString(),
          descrizione: 'Numero di giorni per l\'attribuzione delle prenotazioni Calendly ai lead'
        },
        {
          key: 'days_before_assignable',
          value: daysBeforeAssignable.toString(),
          descrizione: 'Numero di giorni che devono passare prima che un lead sia assegnabile'
        },
        {
          key: 'duplicate_check_value',
          value: duplicateCheckValue.toString(),
          descrizione: 'Valore numerico per l\'intervallo di controllo duplicati'
        },
        {
          key: 'duplicate_check_unit',
          value: duplicateCheckUnit,
          descrizione: 'Unità di tempo per il controllo duplicati (minutes o hours)'
        }
      ];

      for (const setting of settingsToUpdate) {
        const { data: existingData, error: selectError } = await supabase
          .from('system_settings')
          .select('*')
          .eq('key', setting.key);
        
        if (selectError) throw selectError;
        
        if (existingData && existingData.length > 0) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('system_settings')
            .update({ value: setting.value })
            .eq('key', setting.key);
            
          if (updateError) throw updateError;
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('system_settings')
            .insert(setting);
            
          if (insertError) throw insertError;
        }
      }
      
      toast.success("Tutte le impostazioni sono state salvate con successo");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Errore nel salvare le impostazioni");
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle>Finestre di Attribuzione</CardTitle>
          <CardDescription>
            Configura i parametri temporali per l'attribuzione delle prenotazioni ai lead e il controllo duplicati
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-6">
              {/* Attribution Days */}
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
                <Input
                  id="attributionDays"
                  type="number"
                  min="1"
                  max="365"
                  value={attributionDays}
                  onChange={(e) => setAttributionDays(parseInt(e.target.value) || 30)}
                  disabled={isLoading}
                />
              </div>

              {/* Days Before Assignable */}
              <div className="grid gap-2">
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
                <Input
                  id="daysBeforeAssignable"
                  type="number"
                  min="0"
                  max="365"
                  value={daysBeforeAssignable}
                  onChange={(e) => setDaysBeforeAssignable(parseInt(e.target.value) || 0)}
                  disabled={isLoading}
                />
              </div>

              {/* Duplicate Check Settings */}
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Label>Controllo duplicati lead</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-80">Definisce l'intervallo di tempo entro il quale un lead viene considerato duplicato se ha email, telefono o nome/cognome identici.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min="1"
                    max="999"
                    value={duplicateCheckValue}
                    onChange={(e) => setDuplicateCheckValue(parseInt(e.target.value) || 5)}
                    disabled={isLoading}
                    className="w-24"
                  />
                  <Select value={duplicateCheckUnit} onValueChange={setDuplicateCheckUnit} disabled={isLoading}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minuti</SelectItem>
                      <SelectItem value="hours">Ore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Single Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button 
                onClick={saveAllSettings} 
                disabled={isLoading || isSaving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Salvataggio..." : "Salva Tutte le Impostazioni"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
