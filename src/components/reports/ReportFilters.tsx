
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, FilterIcon } from "lucide-react";
import { useMarket } from "@/contexts/MarketContext";
import { ReportFilters, PRESET_PERIODS, getAvailableVenditori } from "@/services/reportsService";
import ReportSourceFilters from "./ReportSourceFilters";

interface ReportFiltersProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onApplyFilters: () => void;
}

const ReportFiltersComponent = ({ filters, onFiltersChange, onApplyFilters }: ReportFiltersProps) => {
  const { selectedMarket } = useMarket();
  const [venditori, setVenditori] = useState<string[]>([]);

  useEffect(() => {
    const loadOptions = async () => {
      const availableVenditori = await getAvailableVenditori(selectedMarket);
      setVenditori(availableVenditori);
    };

    loadOptions();
  }, [selectedMarket]);

  const handlePresetPeriod = (periodKey: string) => {
    const period = PRESET_PERIODS[periodKey as keyof typeof PRESET_PERIODS];
    if (period) {
      onFiltersChange({
        ...filters,
        startDate: period.startDate,
        endDate: period.endDate
      });
    }
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const handleVenditoreChange = (value: string) => {
    console.log('Venditore changed to:', value);
    if (value === 'all-venditori') {
      const newFilters = { ...filters };
      delete newFilters.venditore;
      onFiltersChange(newFilters);
    } else {
      onFiltersChange({ 
        ...filters, 
        venditore: value 
      });
    }
  };

  const handleSourceModeChange = (mode: 'include' | 'exclude') => {
    onFiltersChange({
      ...filters,
      sourceMode: mode,
      // Pulisci i filtri fonte singola quando si usano i filtri avanzati
      fonte: undefined
    });
  };

  const handleFontiIncluseChange = (fontiIncluse: string[]) => {
    onFiltersChange({
      ...filters,
      fontiIncluse,
      fonte: undefined // Pulisci il filtro fonte singola
    });
  };

  const handleFontiEscluseChange = (fontiEscluse: string[]) => {
    onFiltersChange({
      ...filters,
      fontiEscluse,
      fonte: undefined // Pulisci il filtro fonte singola
    });
  };

  const handleClearSourceFilters = () => {
    onFiltersChange({
      ...filters,
      fontiIncluse: [],
      fontiEscluse: [],
      sourceMode: 'exclude'
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Filtri Report Base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Periodi Predefiniti */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Periodo Predefinito</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(PRESET_PERIODS).map(([key, period]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetPeriod(key)}
                  className="text-xs"
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date Personalizzate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium">
                Data Inizio
              </Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm font-medium">
                Data Fine
              </Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>

          {/* Filtro Venditore */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Venditore</Label>
            <Select
              value={filters.venditore || 'all-venditori'}
              onValueChange={handleVenditoreChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona venditore" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-venditori">Tutti i venditori</SelectItem>
                {venditori.map((venditore) => (
                  <SelectItem key={venditore} value={venditore}>
                    {venditore}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Filtri per Fonte */}
      <ReportSourceFilters
        sourceMode={filters.sourceMode || 'exclude'}
        onSourceModeChange={handleSourceModeChange}
        fontiIncluse={filters.fontiIncluse || []}
        fontiEscluse={filters.fontiEscluse || []}
        onFontiIncluseChange={handleFontiIncluseChange}
        onFontiEscluseChange={handleFontiEscluseChange}
        onClearSourceFilters={handleClearSourceFilters}
      />

      {/* Pulsanti */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button onClick={onApplyFilters} className="flex-1">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Applica Filtri
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Azzera
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportFiltersComponent;
