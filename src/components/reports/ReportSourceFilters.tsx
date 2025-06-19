
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";
import { getAvailableFonti } from "@/services/reportsService";

interface ReportSourceFiltersProps {
  sourceMode: 'include' | 'exclude';
  onSourceModeChange: (mode: 'include' | 'exclude') => void;
  fontiIncluse: string[];
  fontiEscluse: string[];
  onFontiIncluseChange: (fonti: string[]) => void;
  onFontiEscluseChange: (fonti: string[]) => void;
  onClearSourceFilters: () => void;
}

const ReportSourceFilters = ({
  sourceMode,
  onSourceModeChange,
  fontiIncluse,
  fontiEscluse,
  onFontiIncluseChange,
  onFontiEscluseChange,
  onClearSourceFilters
}: ReportSourceFiltersProps) => {
  const [availableFonti, setAvailableFonti] = useState<string[]>([]);
  const [selectedFonte, setSelectedFonte] = useState<string>('');

  useEffect(() => {
    const loadFonti = async () => {
      const fonti = await getAvailableFonti();
      setAvailableFonti(fonti);
    };
    loadFonti();
  }, []);

  const handleAddFonte = () => {
    if (!selectedFonte) return;

    if (sourceMode === 'include') {
      if (!fontiIncluse.includes(selectedFonte)) {
        onFontiIncluseChange([...fontiIncluse, selectedFonte]);
      }
    } else {
      if (!fontiEscluse.includes(selectedFonte)) {
        onFontiEscluseChange([...fontiEscluse, selectedFonte]);
      }
    }
    setSelectedFonte('');
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
    return availableFonti.filter(fonte => !selectedFonti.includes(fonte));
  };

  const hasActiveFilters = fontiIncluse.length > 0 || fontiEscluse.length > 0;

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
      <CardContent className="space-y-4">
        {/* Modalità di filtro */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Modalità Filtro</Label>
          <div className="flex gap-2">
            <Button
              variant={sourceMode === 'include' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSourceModeChange('include')}
            >
              Includi Solo
            </Button>
            <Button
              variant={sourceMode === 'exclude' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSourceModeChange('exclude')}
            >
              Escludi
            </Button>
          </div>
        </div>

        {/* Selezione fonte */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            {sourceMode === 'include' ? 'Aggiungi Fonte da Includere' : 'Aggiungi Fonte da Escludere'}
          </Label>
          <div className="flex gap-2">
            <Select value={selectedFonte} onValueChange={setSelectedFonte}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Seleziona una fonte" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableForSelection().map((fonte) => (
                  <SelectItem key={fonte} value={fonte}>
                    {fonte}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddFonte}
              disabled={!selectedFonte}
              size="sm"
            >
              Aggiungi
            </Button>
          </div>
        </div>

        {/* Fonti selezionate */}
        {getSelectedFonti().length > 0 && (
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Fonti {sourceMode === 'include' ? 'Incluse' : 'Escluse'}:
            </Label>
            <div className="flex flex-wrap gap-2">
              {getSelectedFonti().map((fonte) => (
                <Badge key={fonte} variant="secondary" className="flex items-center gap-1">
                  {fonte}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => handleRemoveFonte(fonte)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportSourceFilters;
