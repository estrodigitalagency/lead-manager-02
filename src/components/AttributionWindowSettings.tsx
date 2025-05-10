
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSystemSettings, updateSystemSettings } from "@/services/databaseService";
import { Loader2, Save, RefreshCcw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { checkLeadsAssignability } from "@/services/edgeFunctionService";
import { toast } from "sonner";

const AttributionWindowSettings = () => {
  const [attributionWindow, setAttributionWindow] = useState<string>("30");
  const [assignabilityWindow, setAssignabilityWindow] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const [savingAttribution, setSavingAttribution] = useState(false);
  const [savingAssignability, setSavingAssignability] = useState(false);
  const [checkingAssignability, setCheckingAssignability] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      const attributionValue = await getSystemSettings('booking_attribution_window_days');
      const assignabilityValue = await getSystemSettings('lead_assignability_window_days');
      
      if (attributionValue) {
        setAttributionWindow(attributionValue);
      }
      
      if (assignabilityValue) {
        setAssignabilityWindow(assignabilityValue);
      } else {
        setAssignabilityWindow("0"); // Default to 0 if not set
      }
      
      setLoading(false);
    };

    loadSettings();
  }, []);

  const handleSaveAttribution = async () => {
    if (!attributionWindow || isNaN(Number(attributionWindow)) || Number(attributionWindow) <= 0) {
      return;
    }

    setSavingAttribution(true);
    await updateSystemSettings('booking_attribution_window_days', attributionWindow);
    setSavingAttribution(false);
  };

  const handleSaveAssignability = async () => {
    if (!assignabilityWindow || isNaN(Number(assignabilityWindow)) || Number(assignabilityWindow) < 0) {
      return;
    }

    setSavingAssignability(true);
    await updateSystemSettings('lead_assignability_window_days', assignabilityWindow);
    setSavingAssignability(false);
    
    // Ask if the user wants to update the assignability status of existing leads
    toast.message(
      "Aggiornare l'assegnabilità dei lead esistenti?",
      {
        description: "Questo verificherà tutti i lead e aggiornerà il loro stato di assegnabilità in base alla nuova impostazione.",
        action: {
          label: "Aggiorna",
          onClick: () => handleCheckAssignability(),
        },
      }
    );
  };

  const handleCheckAssignability = async () => {
    setCheckingAssignability(true);
    const result = await checkLeadsAssignability();
    setCheckingAssignability(false);
    
    if (result.success) {
      toast.success(`Controllo assegnabilità completato. ${result.updated || 0} lead aggiornati.`);
    } else {
      toast.error(result.message);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Caricamento impostazioni...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Impostazioni di Tempo</CardTitle>
        <CardDescription>
          Configura le finestre temporali per l'attribuzione delle prenotazioni e l'assegnabilità dei lead
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Finestra di Attribuzione</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Imposta il numero di giorni entro cui una prenotazione può essere attribuita a un lead esistente.
              Quando una prenotazione viene ricevuta dal webhook, il sistema cerca lead corrispondenti (per email o telefono)
              creati entro questa finestra temporale.
            </p>
            
            <div className="grid gap-2">
              <Label htmlFor="attributionWindow">Giorni per finestra di attribuzione</Label>
              <div className="flex gap-2">
                <Input
                  id="attributionWindow"
                  type="number"
                  value={attributionWindow}
                  onChange={(e) => setAttributionWindow(e.target.value)}
                  min="1"
                  className="w-32"
                />
                <Button 
                  onClick={handleSaveAttribution} 
                  disabled={savingAttribution}
                  className="flex items-center gap-2"
                >
                  {savingAttribution ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Salva
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Valore corrente: {attributionWindow} giorni
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium">Finestra di Assegnabilità</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Imposta il numero di giorni che devono passare dalla creazione di un lead prima che possa essere considerato 
              assegnabile per i venditori. I lead saranno assegnabili solo se non hanno prenotazioni e se sono stati creati
              da più di questo numero di giorni.
            </p>
            
            <div className="grid gap-2">
              <Label htmlFor="assignabilityWindow">Giorni per assegnabilità del lead</Label>
              <div className="flex gap-2">
                <Input
                  id="assignabilityWindow"
                  type="number"
                  value={assignabilityWindow}
                  onChange={(e) => setAssignabilityWindow(e.target.value)}
                  min="0"
                  className="w-32"
                />
                <Button 
                  onClick={handleSaveAssignability} 
                  disabled={savingAssignability}
                  className="flex items-center gap-2"
                >
                  {savingAssignability ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Salva
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCheckAssignability}
                  disabled={checkingAssignability}
                  className="flex items-center gap-2"
                >
                  {checkingAssignability ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Aggiornamento...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="h-4 w-4" />
                      Aggiorna assegnabilità
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Valore corrente: {assignabilityWindow} giorni
                {Number(assignabilityWindow) === 0 && " (assegnabile subito)"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttributionWindowSettings;
