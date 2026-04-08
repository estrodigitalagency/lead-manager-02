
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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <h3 className="text-sm sm:text-base font-semibold">Controllo Temporale</h3>
      </div>

      <div className="p-3 sm:p-4 rounded-xl bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
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
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <Info className="h-3 w-3 text-primary" />
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
