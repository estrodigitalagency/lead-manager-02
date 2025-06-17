
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Clock, Info } from "lucide-react";

interface BypassTimeIntervalControlProps {
  bypassTimeInterval: boolean;
  onToggleBypass: () => void;
  disabled?: boolean;
}

export const BypassTimeIntervalControl = ({ 
  bypassTimeInterval, 
  onToggleBypass, 
  disabled = false 
}: BypassTimeIntervalControlProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold">Controllo Temporale</h3>
      </div>
      
      <div className={`p-4 rounded-lg border-2 transition-all ${
        bypassTimeInterval 
          ? 'border-orange-300 bg-orange-50/80' 
          : 'border-blue-200 bg-blue-50/50'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Switch
              id="bypass-time-interval"
              checked={bypassTimeInterval}
              onCheckedChange={onToggleBypass}
              disabled={disabled}
            />
            <Label 
              htmlFor="bypass-time-interval" 
              className="text-sm font-medium cursor-pointer"
            >
              Bypassa intervallo d'assegnazione
            </Label>
          </div>
        </div>
        
        <div className="text-sm space-y-2">
          {bypassTimeInterval ? (
            <div className="flex items-start space-x-2 text-orange-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">⚠️ Bypass Attivo</p>
                <p className="text-orange-700">
                  Verranno assegnati <strong>tutti i lead disponibili</strong>, anche quelli recenti che non hanno ancora superato il timer minimo.
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  ✓ La condizione "call prenotata = NO" rimane sempre attiva
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start space-x-2 text-blue-700">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">📋 Assegnazione Standard</p>
                <p className="text-blue-700">
                  Verranno assegnati solo i lead che hanno <strong>superato l'intervallo minimo</strong> configurato nel sistema.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  ✓ Rispetta il timer di attesa + condizione "call prenotata = NO"
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
