
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";

interface SourceFilterProps {
  uniqueSources: string[];
  excludedSources: string[];
  includedSources: string[];
  sourceMode: 'exclude' | 'include';
  onAddExcludedSource: (source: string) => void;
  onRemoveExcludedSource: (source: string) => void;
  onAddIncludedSource: (source: string) => void;
  onRemoveIncludedSource: (source: string) => void;
  onToggleSourceMode: (mode: 'exclude' | 'include') => void;
}

export function SourceFilter({ 
  uniqueSources, 
  excludedSources,
  includedSources,
  sourceMode,
  onAddExcludedSource, 
  onRemoveExcludedSource,
  onAddIncludedSource,
  onRemoveIncludedSource,
  onToggleSourceMode
}: SourceFilterProps) {
  const isMobile = useIsMobile();

  const currentSources = sourceMode === 'exclude' ? excludedSources : includedSources;
  const availableSources = uniqueSources.filter(source => !currentSources.includes(source));

  const handleAddSource = (sourceName: string) => {
    if (sourceMode === 'exclude') {
      onAddExcludedSource(sourceName);
    } else {
      onAddIncludedSource(sourceName);
    }
  };

  const handleRemoveSource = (sourceName: string) => {
    if (sourceMode === 'exclude') {
      onRemoveExcludedSource(sourceName);
    } else {
      onRemoveIncludedSource(sourceName);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center space-x-3">
        <Label className="text-sm font-medium">Modalità Fonti</Label>
        <div className="flex items-center space-x-2">
          <span className={`text-sm ${sourceMode === 'exclude' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            Escludi
          </span>
          <Switch
            checked={sourceMode === 'include'}
            onCheckedChange={(checked) => onToggleSourceMode(checked ? 'include' : 'exclude')}
          />
          <span className={`text-sm ${sourceMode === 'include' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            Includi
          </span>
        </div>
      </div>

      {/* Source Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {sourceMode === 'exclude' ? 'Escludi Fonti' : 'Includi Solo Fonti'}
        </Label>
        <Select onValueChange={handleAddSource}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={
              sourceMode === 'exclude' 
                ? "Seleziona fonte da escludere" 
                : "Seleziona fonte da includere"
            } />
          </SelectTrigger>
          <SelectContent className={`${isMobile ? 'max-h-[200px]' : ''} bg-background border border-border`} position="popper">
            {availableSources.map((source) => (
              <SelectItem 
                key={source} 
                value={source}
                className="hover:bg-accent hover:text-accent-foreground"
              >
                <span className="truncate">{source}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {currentSources.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {currentSources.map((source) => (
              <Badge 
                key={source} 
                variant={sourceMode === 'exclude' ? 'destructive' : 'default'} 
                className="flex items-center gap-1 text-xs max-w-full"
              >
                <span className="truncate">{source}</span>
                <button
                  onClick={() => handleRemoveSource(source)}
                  className="ml-1 hover:text-destructive-foreground flex-shrink-0"
                  aria-label={`Rimuovi ${source}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
        {sourceMode === 'exclude' 
          ? "Le fonti selezionate verranno escluse dall'assegnazione dei lead."
          : "Verranno assegnati solo i lead dalle fonti selezionate."
        }
      </div>
    </div>
  );
}
