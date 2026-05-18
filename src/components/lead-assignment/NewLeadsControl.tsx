import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sparkles, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export type NewLeadsMode = 'days' | 'date';

interface NewLeadsControlProps {
  enabled: boolean;
  mode: NewLeadsMode;
  days: number;
  fromDate: string; // ISO YYYY-MM-DD
  onToggleEnabled: () => void;
  onChangeMode: (mode: NewLeadsMode) => void;
  onChangeDays: (n: number) => void;
  onChangeFromDate: (d: string) => void;
  disabled?: boolean;
}

export const NewLeadsControl = ({
  enabled,
  mode,
  days,
  fromDate,
  onToggleEnabled,
  onChangeMode,
  onChangeDays,
  onChangeFromDate,
  disabled = false,
}: NewLeadsControlProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm sm:text-base font-semibold">Solo lead nuovi</h3>
      </div>

      <div className="p-3 sm:p-4 rounded-xl bg-muted/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Switch
              id="new-leads-enabled"
              checked={enabled}
              onCheckedChange={onToggleEnabled}
              disabled={disabled}
            />
            <Label htmlFor="new-leads-enabled" className="text-sm font-medium cursor-pointer">
              Filtra per data di ingresso
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
                  Considera solo lead generati nel periodo scelto (ultimi N giorni) o da una data specifica.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {enabled && (
          <>
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={mode === 'days' ? 'default' : 'outline'}
                className="flex-1 h-8 text-xs"
                onClick={() => onChangeMode('days')}
              >
                Ultimi N giorni
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'date' ? 'default' : 'outline'}
                className="flex-1 h-8 text-xs"
                onClick={() => onChangeMode('date')}
              >
                Da data
              </Button>
            </div>

            {mode === 'days' ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Input
                    id="new-leads-days"
                    type="number"
                    min={1}
                    max={365}
                    value={days}
                    onChange={(e) => onChangeDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-8 text-sm w-24"
                  />
                  <span className="text-sm text-muted-foreground">giorni</span>
                </div>
                <div className="flex gap-1">
                  {[1, 7, 14, 30].map((d) => (
                    <Button
                      key={d}
                      type="button"
                      size="sm"
                      variant={days === d ? 'secondary' : 'ghost'}
                      className="h-6 px-2 text-[10px]"
                      onClick={() => onChangeDays(d)}
                    >
                      {d === 1 ? '24h' : `${d}g`}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="new-leads-from-date" className="text-xs text-muted-foreground">Da</Label>
                <Input
                  id="new-leads-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => onChangeFromDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
