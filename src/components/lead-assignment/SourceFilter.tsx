
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, Filter, Plus, Info, Minus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

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
  onToggleSourceMode
}: SourceFilterProps) {
  const isMobile = useIsMobile();

  const currentSources = sourceMode === 'exclude' ? excludedSources : includedSources;
  const availableSources = uniqueSources.filter(source => !currentSources.includes(source));
  const availableForExclusion = uniqueSources.filter(source => !excludeFromIncluded.includes(source));

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
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold">Filtro per Fonti</h3>
      </div>

      {/* Mode Toggle */}
      <div className="p-4 border border-border rounded-lg bg-card/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
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
          <Select onValueChange={handleAddSource}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={
                sourceMode === 'exclude' 
                  ? "Seleziona una fonte da escludere..." 
                  : "Seleziona una fonte da includere..."
              } />
            </SelectTrigger>
            <SelectContent 
              className="bg-background border border-border z-[100]" 
              position="popper"
              sideOffset={4}
              style={{ 
                maxHeight: isMobile ? '200px' : '300px',
                width: 'var(--radix-select-trigger-width)',
                minWidth: '200px'
              }}
            >
              <ScrollArea className={isMobile ? "h-[180px]" : "h-[280px]"}>
                {availableSources.length > 0 ? (
                  availableSources.map((source) => (
                    <SelectItem 
                      key={source} 
                      value={source}
                      className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    >
                      <span className="truncate max-w-[250px]">{source}</span>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem disabled value="no-sources">
                    {currentSources.length > 0 ? "Nessuna fonte disponibile" : "Nessuna fonte trovata"}
                  </SelectItem>
                )}
              </ScrollArea>
            </SelectContent>
          </Select>
          
          {/* Selected Sources */}
          {currentSources.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {sourceMode === 'exclude' 
                  ? `🚫 Fonti Escluse (${currentSources.length})` 
                  : `✅ Fonti Incluse (${currentSources.length})`
                }
              </Label>
              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 border border-border rounded-lg max-h-32 overflow-y-auto">
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
        <div className="p-4 border border-orange-200 rounded-lg bg-white">
          <div className="flex items-center gap-2 mb-3">
            <Minus className="h-4 w-4 text-orange-600" />
            <Label className="text-sm font-medium text-orange-800">
              Escludi dalle Fonti Incluse
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    type="button"
                    className="flex items-center justify-center w-4 h-4 rounded-full bg-orange-200 hover:bg-orange-300 transition-colors"
                  >
                    <Info className="h-3 w-3 text-orange-700" />
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
            <Select onValueChange={onAddExcludeFromIncluded}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona tag/fonte da escludere dalle incluse..." />
              </SelectTrigger>
              <SelectContent 
                className="bg-background border border-border z-[200]" 
                position="popper"
                sideOffset={4}
                style={{ 
                  maxHeight: isMobile ? '200px' : '300px',
                  width: 'var(--radix-select-trigger-width)',
                  minWidth: '250px'
                }}
              >
                <ScrollArea className={isMobile ? "h-[180px]" : "h-[280px]"}>
                  {availableForExclusion.length > 0 ? (
                    availableForExclusion.map((source) => (
                      <SelectItem 
                        key={source} 
                        value={source}
                        className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      >
                        <span className="truncate max-w-[200px]">{source}</span>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem disabled value="no-sources-for-exclusion">
                      Nessuna fonte disponibile per esclusione
                    </SelectItem>
                  )}
                </ScrollArea>
              </SelectContent>
            </Select>

            {/* Excluded from Included Sources */}
            {excludeFromIncluded.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-orange-700">
                  ➖ Escluse dalle Incluse ({excludeFromIncluded.length})
                </Label>
                <div className="flex flex-wrap gap-2 p-3 bg-orange-100/50 border border-orange-200 rounded-lg max-h-32 overflow-y-auto">
                  {excludeFromIncluded.map((source) => (
                    <Badge 
                      key={source} 
                      variant="outline"
                      className="flex items-center gap-1 text-xs max-w-full px-2 py-1 border-orange-300 text-orange-800 bg-orange-50"
                    >
                      <span className="truncate max-w-[150px]">{source}</span>
                      <button
                        onClick={() => onRemoveExcludeFromIncluded(source)}
                        className="ml-1 hover:bg-orange-200 rounded-full p-0.5 flex-shrink-0"
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

          <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-800">
            <strong>Esempio:</strong> Se includi "Workshop2025" ma escludi "Sales", 
            verranno assegnati solo i lead con "Workshop2025" che NON contengono "Sales".
          </div>
        </div>
      )}
    </div>
  );
}
