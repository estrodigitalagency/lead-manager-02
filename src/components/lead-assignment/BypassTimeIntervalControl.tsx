
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

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
    <div className="flex flex-col space-y-3 p-4 border border-orange-200 rounded-lg bg-orange-50">
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
      
      {bypassTimeInterval && (
        <div className="flex items-start space-x-2 text-sm text-orange-700">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Attenzione: Bypass attivo</p>
            <p className="text-xs">
              Verranno assegnati anche i lead che non hanno superato il timer minimo. 
              La condizione "call prenotata = NO" rimane sempre attiva.
            </p>
          </div>
        </div>
      )}
      
      {!bypassTimeInterval && (
        <p className="text-xs text-gray-600">
          Assegnazione standard: solo lead che hanno superato l'intervallo minimo configurato
        </p>
      )}
    </div>
  );
};
