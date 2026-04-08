
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Filter, Plus, Info, Minus, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SearchableSourceSelect } from "@/components/ui/searchable-source-select";

interface SourceFilterProps {
  uniqueSources: string[];
  excludedSources: string[];
  includedSources: string[];
  excludeFromIncluded: string[];
  sourceMode: 'exclude' | 'include';
  onAddExcludedSource: (source: string) => void;
  onRemoveExcludedSource: (source: string) => void;
  onAddIncludedSource: (source: string) => void;
  onRemoveIncludedSource: (source: string) => void;
  onAddExcludeFromIncluded: (source: string) => void;
  onRemoveExcludeFromIncluded: (source: string) => void;
  onToggleSourceMode: (mode: 'exclude' | 'include') => void;
  onRefreshSources?: () => void;
}

export function SourceFilter({ 
  uniqueSources, 
  excludedSources,
  includedSources,
  excludeFromIncluded,
  sourceMode,
  onAddExcludedSource, 
  onRemoveExcludedSource,
  onAddIncludedSource,
  onRemoveIncludedSource,
  onAddExcludeFromIncluded,
  onRemoveExcludeFromIncluded,
  onToggleSourceMode,
  onRefreshSources
}: SourceFilterProps) {
  const currentSources = sourceMode === 'exclude' ? excludedSources : includedSources;
  
  // Normalizzazione per confronti robusti (case/whitespace insensitive)
  const normalize = (s: string) => s?.trim().toLowerCase();
  const currentNorm = new Set(currentSources.map(normalize));
  const excludeFromIncludedNorm = new Set(excludeFromIncluded.map(normalize));

  const availableSources = uniqueSources
    .filter((source) => !currentNorm.has(normalize(source)))
    .filter((source) => (sourceMode === 'include' ? !excludeFromIncludedNorm.has(normalize(source)) : true))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'accent', numeric: true }));
  const availableForExclusion = includedSources
    .filter(source => !excludeFromIncludedNorm.has(normalize(source)))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'accent', numeric: true }));

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

  const handleAddExclusion = (sourceName: string) => {
    onAddExcludeFromIncluded(sourceName);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="text-sm sm:text-base font-semibold">Filtro per Fonti</h3>
        </div>
        {onRefreshSources && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshSources}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Aggiorna
          </Button>
        )}
      </div>

      {/* Mode Toggle */}
      <div className="p-3 sm:p-4 rounded-xl bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Switch
              checked={sourceMode === 'include'}
              onCheckedChange={(checked) => onToggleSourceMode(checked ? 'include' : 'exclude')}
            />
            <Label className="text-sm font-medium">
              {sourceMode === 'exclude' ? '🚫 Escludi Fonti' : '✅ Includi Fonti'}
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
                  {sourceMode === 'exclude' 
                    ? "Le fonti selezionate verranno escluse dall'assegnazione. Tutti gli altri lead verranno considerati."
                    : "Verranno assegnati SOLO i lead dalle fonti selezionate. Tutte le altre fonti verranno ignorate."
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Source Selection */}
        <div className="space-y-3">
          <SearchableSourceSelect
            sources={availableSources}
            onSelect={handleAddSource}
            placeholder={
              sourceMode === 'exclude' 
                ? "Cerca e seleziona una fonte da escludere..." 
                : "Cerca e seleziona una fonte da includere..."
            }
            emptyMessage={currentSources.length > 0 ? "Nessuna fonte disponibile" : "Nessuna fonte trovata"}
          />
          
          {/* Selected Sources */}
          {currentSources.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {sourceMode === 'exclude' 
                  ? `🚫 Fonti Escluse (${currentSources.length})` 
                  : `✅ Fonti Incluse (${currentSources.length})`
                }
              </Label>
              <div className="flex flex-wrap gap-2 p-3 bg-muted/20 rounded-xl max-h-32 overflow-y-auto">
                {currentSources.map((source) => (
                  <Badge 
                    key={source} 
                    variant={sourceMode === 'exclude' ? 'destructive' : 'default'} 
                    className="flex items-center gap-1 text-xs max-w-full px-2 py-1"
                  >
                    <span className="truncate max-w-[150px]">{source}</span>
                    <button
                      onClick={() => handleRemoveSource(source)}
                      className="ml-1 hover:bg-white/20 rounded-full p-0.5 flex-shrink-0"
                      aria-label={`Rimuovi ${source}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Esclusioni dalle Fonti Incluse - Solo quando si usa modalità "include" */}
      {sourceMode === 'include' && includedSources.length > 0 && (
        <div className="p-4 rounded-xl bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <Minus className="h-4 w-4 text-destructive" />
            <Label className="text-sm font-medium">
              Escludi dalle Fonti Incluse
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    type="button"
                    className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Info className="h-3 w-3 text-primary" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">
                    Permette di escludere lead specifici dalle fonti che hai incluso. 
                    Ad esempio: includi "Workshop2025" ma escludi quelli con tag "Sales".
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="space-y-3">
            <SearchableSourceSelect
              sources={availableForExclusion}
              onSelect={handleAddExclusion}
              placeholder="Cerca tag/fonte da escludere dalle incluse..."
              emptyMessage="Nessuna fonte disponibile per esclusione"
            />

            {/* Excluded from Included Sources */}
            {excludeFromIncluded.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  ➖ Escluse dalle Incluse ({excludeFromIncluded.length})
                </Label>
                <div className="flex flex-wrap gap-2 p-3 bg-muted/20 rounded-xl max-h-32 overflow-y-auto">
                  {excludeFromIncluded.map((source) => (
                    <Badge 
                      key={source} 
                      variant="destructive"
                      className="flex items-center gap-1 text-xs max-w-full px-2 py-1"
                    >
                      <span className="truncate max-w-[150px]">{source}</span>
                      <button
                        onClick={() => onRemoveExcludeFromIncluded(source)}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5 flex-shrink-0"
                        aria-label={`Rimuovi esclusione ${source}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
            <strong>Esempio:</strong> Se includi "Workshop2025" ma escludi "Sales", 
            verranno assegnati solo i lead con "Workshop2025" che NON contengono "Sales".
          </div>
        </div>
      )}
    </div>
  );
}
