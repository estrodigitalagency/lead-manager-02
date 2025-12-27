
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { SearchableSourceSelect } from "@/components/ui/searchable-source-select";

interface ExcludedSourcesProps {
  uniqueSources: string[];
  excludedSources: string[];
  onAddExcludedSource: (source: string) => void;
  onRemoveExcludedSource: (source: string) => void;
}

export function ExcludedSources({ 
  uniqueSources, 
  excludedSources, 
  onAddExcludedSource, 
  onRemoveExcludedSource 
}: ExcludedSourcesProps) {
  const availableSources = uniqueSources
    .filter(source => !excludedSources.includes(source))
    .sort();

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Escludi Fonti</Label>
      <SearchableSourceSelect
        sources={availableSources}
        onSelect={onAddExcludedSource}
        placeholder="Cerca fonte da escludere..."
        emptyMessage="Nessuna fonte disponibile"
      />
      
      {excludedSources.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {excludedSources.map((source) => (
            <Badge key={source} variant="secondary" className="flex items-center gap-1 text-xs max-w-full">
              <span className="truncate">{source}</span>
              <button
                onClick={() => onRemoveExcludedSource(source)}
                className="ml-1 hover:text-destructive flex-shrink-0"
                aria-label={`Rimuovi ${source}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
