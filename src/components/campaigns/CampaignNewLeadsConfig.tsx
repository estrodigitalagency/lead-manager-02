import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InfoIcon, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CampaignNewLeadsConfigProps {
  enabled: boolean;
  giorni: number | null;
  daData: string | null;
  onChange: (next: { enabled: boolean; giorni: number | null; daData: string | null }) => void;
}

const CampaignNewLeadsConfig = ({ enabled, giorni, daData, onChange }: CampaignNewLeadsConfigProps) => {
  const mode: 'days' | 'date' = giorni != null ? 'days' : daData != null ? 'date' : 'days';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <Label className="text-base font-semibold">Solo Lead Nuovi (Opzionale)</Label>
      </div>
      <p className="text-sm text-muted-foreground">
        Quando selezioni questa campagna, il filtro "lead nuovi" si attiverà automaticamente con questi parametri.
      </p>

      <div className="p-4 border rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => onChange({ enabled: checked, giorni: checked ? (giorni ?? 7) : null, daData: null })}
            />
            <Label className="text-sm font-medium">Filtra per data di ingresso</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Considera solo lead generati nel periodo scelto (ultimi N giorni) o da una data specifica.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {enabled && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={mode === 'days' ? 'default' : 'outline'}
                className="flex-1 h-8 text-xs"
                onClick={() => onChange({ enabled: true, giorni: giorni ?? 7, daData: null })}
              >
                Ultimi N giorni
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'date' ? 'default' : 'outline'}
                className="flex-1 h-8 text-xs"
                onClick={() => onChange({ enabled: true, giorni: null, daData: daData ?? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10) })}
              >
                Da data
              </Button>
            </div>

            {mode === 'days' ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={giorni ?? 7}
                  onChange={(e) => onChange({ enabled: true, giorni: Math.max(1, parseInt(e.target.value) || 1), daData: null })}
                  className="h-8 text-sm w-24"
                />
                <span className="text-sm text-muted-foreground">giorni</span>
                <div className="flex gap-1 ml-2">
                  {[1, 7, 14, 30].map((d) => (
                    <Button
                      key={d}
                      type="button"
                      size="sm"
                      variant={giorni === d ? 'secondary' : 'ghost'}
                      className="h-6 px-2 text-[10px]"
                      onClick={() => onChange({ enabled: true, giorni: d, daData: null })}
                    >
                      {d === 1 ? '24h' : `${d}g`}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Da</Label>
                <Input
                  type="date"
                  value={daData ?? ''}
                  onChange={(e) => onChange({ enabled: true, giorni: null, daData: e.target.value || null })}
                  className="h-8 text-sm"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignNewLeadsConfig;
