
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
      
      <div className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50/50">
        <div className="flex items-center justify-between">
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
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  type="button"
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors"
                >
                  <Info className="h-3 w-3 text-blue-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">
                  Scegli se assegnare o meno i lead che hanno superato l'intervallo minimo configurato nel sistema.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};
