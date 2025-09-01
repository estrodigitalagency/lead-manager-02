import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { InfoIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CampaignBypassConfigProps {
  bypassTimeInterval: boolean;
  onToggleBypass: (bypass: boolean) => void;
}

const CampaignBypassConfig = ({
  bypassTimeInterval,
  onToggleBypass
}: CampaignBypassConfigProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">Bypass Intervallo Temporale (Opzionale)</Label>
      <p className="text-sm text-muted-foreground">
        Quando selezioni questa campagna, il bypass temporale si attiverà automaticamente
      </p>
      
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center space-x-3">
          <Switch
            checked={bypassTimeInterval}
            onCheckedChange={onToggleBypass}
          />
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">
              Bypassa Intervallo di Tempo
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Quando attivo, include anche i lead recenti nell'assegnazione, 
                    bypassando l'intervallo temporale minimo.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          {bypassTimeInterval ? 'Attivo' : 'Disattivo'}
        </div>
      </div>
    </div>
  );
};

export default CampaignBypassConfig;