
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSystemSettings, updateSystemSettings } from "@/services/systemSettingsService";
import { Loader2, Save } from "lucide-react";

const AttributionWindowSettings = () => {
  const [attributionWindow, setAttributionWindow] = useState<string>("30");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      const value = await getSystemSettings('booking_attribution_window_days');
      if (value) {
        setAttributionWindow(value);
      }
      setLoading(false);
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!attributionWindow || isNaN(Number(attributionWindow)) || Number(attributionWindow) <= 0) {
      return;
    }

    setSaving(true);
    await updateSystemSettings('booking_attribution_window_days', attributionWindow);
    setSaving(false);
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
        <CardTitle>Finestra di Attribuzione</CardTitle>
        <CardDescription>
          Imposta il numero di giorni entro cui una prenotazione può essere attribuita a un lead esistente.
          Quando una prenotazione viene ricevuta dal webhook, il sistema cerca lead corrispondenti (per email o telefono)
          creati entro questa finestra temporale.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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
                onClick={handleSave} 
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
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
      </CardContent>
    </Card>
  );
};

export default AttributionWindowSettings;
