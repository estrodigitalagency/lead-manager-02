import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Flame, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LeadScoreHotFilterProps {
  onlyHotLeads: boolean;
  onToggleHotLeads: () => void;
  disabled?: boolean;
}

export const LeadScoreHotFilter = ({ 
  onlyHotLeads, 
  onToggleHotLeads, 
  disabled = false 
}: LeadScoreHotFilterProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-primary" />
        <h3 className="text-sm sm:text-base font-semibold">Filtro Lead Score</h3>
      </div>

      <div className="p-3 sm:p-4 rounded-xl bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Switch
              id="only-hot-leads"
              checked={onlyHotLeads}
              onCheckedChange={onToggleHotLeads}
              disabled={disabled}
            />
            <Label 
              htmlFor="only-hot-leads" 
              className="text-sm font-medium cursor-pointer"
            >
              🔥 Solo Lead Score = "Hot"
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
                  Quando attivato, verranno assegnati solo i lead con Lead Score = "Hot". 
                  Gli altri lead vengono ignorati nell'assegnazione.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};