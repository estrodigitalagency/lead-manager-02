
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";
import { useMarket } from "@/contexts/MarketContext";
import { getUniqueSourcesFromLeads } from "@/services/databaseService";
import { SearchableSourceSelect } from "@/components/ui/searchable-source-select";

interface ReportSourceFiltersProps {
  sourceMode: 'include' | 'exclude';
  onSourceModeChange: (mode: 'include' | 'exclude') => void;
  fontiIncluse: string[];
  fontiEscluse: string[];
  onFontiIncluseChange: (fonti: string[]) => void;
  onFontiEscluseChange: (fonti: string[]) => void;
  onClearSourceFilters: () => void;
  inline?: boolean;
}

const ReportSourceFilters = ({
  sourceMode,
  onSourceModeChange,
  fontiIncluse,
  fontiEscluse,
  onFontiIncluseChange,
  onFontiEscluseChange,
  onClearSourceFilters,
  inline = false
}: ReportSourceFiltersProps) => {
  const { selectedMarket } = useMarket();
  const [availableFonti, setAvailableFonti] = useState<string[]>([]);

  useEffect(() => {
    const loadFonti = async () => {
      const fonti = await getUniqueSourcesFromLeads(selectedMarket);
      setAvailableFonti(fonti);
    };
    loadFonti();
  }, [selectedMarket]);

  const handleAddFonte = (fonte: string) => {
    if (!fonte) return;

    if (sourceMode === 'include') {
      if (!fontiIncluse.includes(fonte)) {
        onFontiIncluseChange([...fontiIncluse, fonte]);
      }
    } else {
      if (!fontiEscluse.includes(fonte)) {
        onFontiEscluseChange([...fontiEscluse, fonte]);
      }
    }
  };

  const handleRemoveFonte = (fonte: string) => {
    if (sourceMode === 'include') {
      onFontiIncluseChange(fontiIncluse.filter(f => f !== fonte));
    } else {
      onFontiEscluseChange(fontiEscluse.filter(f => f !== fonte));
    }
  };

  const getSelectedFonti = () => {
    return sourceMode === 'include' ? fontiIncluse : fontiEscluse;
  };

  const getAvailableForSelection = () => {
    const selectedFonti = getSelectedFonti();
    return availableFonti.filter(fonte => !selectedFonti.includes(fonte)).sort();
  };

  const hasActiveFilters = fontiIncluse.length > 0 || fontiEscluse.length > 0;

  const content = (
    <div className="space-y-3">
      {/* Header for inline mode */}
      {inline && (
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground">Filtri per Fonte</Label>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSourceFilters}
              className="h-6 px-2 text-[11px] text-muted-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Azzera
            </Button>
          )}
        </div>
      )}

      {/* Modalità di filtro */}
      <div className="flex items-center gap-2">
        <Button
          variant={sourceMode === 'include' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSourceModeChange('include')}
          className="text-xs h-8"
        >
          Includi Solo
        </Button>
        <Button
          variant={sourceMode === 'exclude' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSourceModeChange('exclude')}
          className="text-xs h-8"
        >
          Escludi
        </Button>
      </div>

      {/* Selezione fonte */}
      <SearchableSourceSelect
        sources={getAvailableForSelection()}
        onSelect={handleAddFonte}
        placeholder={sourceMode === 'include' ? 'Aggiungi fonte da includere...' : 'Aggiungi fonte da escludere...'}
        emptyMessage="Nessuna fonte trovata"
      />

      {/* Fonti selezionate */}
      {getSelectedFonti().length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {getSelectedFonti().map((fonte) => (
            <Badge key={fonte} variant="secondary" className="flex items-center gap-1 text-xs">
              {fonte}
              <button
                type="button"
                className="ml-0.5 hover:text-foreground transition-colors"
                onClick={() => handleRemoveFonte(fonte)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtri per Fonte
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearSourceFilters}
              className="ml-auto"
            >
              Azzera Filtri
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};

export default ReportSourceFilters;
