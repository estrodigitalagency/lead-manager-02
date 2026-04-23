
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, FilterIcon, Info, ChevronDown, X } from "lucide-react";
import { useMarket } from "@/contexts/MarketContext";
import { ReportFilters, PRESET_PERIODS, getAvailableVenditori } from "@/services/reportsService";
import { getAllCampagne } from "@/services/databaseService";
import ReportSourceFilters from "./ReportSourceFilters";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface ReportFiltersProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onApplyFilters: () => void;
}

const ReportFiltersComponent = ({ filters, onFiltersChange, onApplyFilters }: ReportFiltersProps) => {
  const { selectedMarket } = useMarket();
  const [venditori, setVenditori] = useState<string[]>([]);
  const [campagne, setCampagne] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      const [availableVenditori, availableCampagne] = await Promise.all([
        getAvailableVenditori(selectedMarket),
        getAllCampagne(selectedMarket)
      ]);
      setVenditori(availableVenditori);
      setCampagne((availableCampagne as any[]).map((c: any) => c.nome).filter(Boolean).sort());
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

  const handleCampagnaChange = (value: string) => {
    if (value === 'all-campagne') {
      const newFilters = { ...filters };
      delete newFilters.campagna;
      onFiltersChange(newFilters);
    } else {
      onFiltersChange({
        ...filters,
        campagna: value
      });
    }
  };

  const handleSourceModeChange = (mode: 'include' | 'exclude') => {
    onFiltersChange({
      ...filters,
      sourceMode: mode,
      fonte: undefined
    });
  };

  const handleFontiIncluseChange = (fontiIncluse: string[]) => {
    onFiltersChange({
      ...filters,
      fontiIncluse,
      fonte: undefined
    });
  };

  const handleFontiEscluseChange = (fontiEscluse: string[]) => {
    onFiltersChange({
      ...filters,
      fontiEscluse,
      fonte: undefined
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

  const hasActiveFilters = filters.startDate ||
    filters.endDate ||
    filters.fonte ||
    filters.venditore ||
    filters.campagna ||
    (filters.fontiIncluse && filters.fontiIncluse.length > 0) ||
    (filters.fontiEscluse && filters.fontiEscluse.length > 0);

  const activeFilterCount = [
    filters.startDate || filters.endDate ? 1 : 0,
    filters.venditore ? 1 : 0,
    filters.campagna ? 1 : 0,
    (filters.fontiIncluse?.length || 0) + (filters.fontiEscluse?.length || 0) > 0 ? 1 : 0,
    filters.callAttributionMode === 'fonte_calendario' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardContent className="p-0">
        {/* Compact header bar - always visible */}
        <div className="flex items-center justify-between p-3 sm:p-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="icon-container-sm bg-primary/8">
              <FilterIcon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">Filtri</span>
            {activeFilterCount > 0 && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5">
                {activeFilterCount}
              </Badge>
            )}

            {/* Active filters badges - inline */}
            {hasActiveFilters && (
              <div className="hidden sm:flex items-center gap-1.5 flex-wrap ml-1">
                {(filters.startDate || filters.endDate) && (
                  <Badge variant="secondary" className="text-[10px] gap-1 h-5">
                    {filters.startDate && new Date(filters.startDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                    {filters.startDate && filters.endDate && ' \u2192 '}
                    {filters.endDate && new Date(filters.endDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                  </Badge>
                )}
                {filters.venditore && (
                  <Badge variant="secondary" className="text-[10px] h-5">{filters.venditore}</Badge>
                )}
                {filters.fontiIncluse && filters.fontiIncluse.length > 0 && (
                  <Badge variant="default" className="text-[10px] h-5">{filters.fontiIncluse.length} incluse</Badge>
                )}
                {filters.fontiEscluse && filters.fontiEscluse.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-5">{filters.fontiEscluse.length} escluse</Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Azzera
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 px-2"
            >
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Preset period quick buttons - always visible */}
        <div className="px-3 sm:px-4 pb-3 flex flex-wrap gap-1.5">
          {Object.entries(PRESET_PERIODS).map(([key, period]) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => handlePresetPeriod(key)}
              className="text-[11px] h-7 px-2.5 rounded-lg"
            >
              {period.label}
            </Button>
          ))}
        </div>

        {/* Expandable detailed filters */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="border-t border-border/60 px-3 sm:px-4 py-4 space-y-4">
            {/* Date + Venditore row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs font-medium text-muted-foreground">Data Inizio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs font-medium text-muted-foreground">Data Fine</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Venditore</Label>
                <Select
                  value={filters.venditore || 'all-venditori'}
                  onValueChange={handleVenditoreChange}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tutti" />
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
            </div>

            {/* Campagna */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Campagna</Label>
              <Select
                value={filters.campagna || 'all-campagne'}
                onValueChange={handleCampagnaChange}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Tutte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-campagne">Tutte le campagne</SelectItem>
                  {campagne.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Attribuzione Call */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Attribuzione Call</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        <strong>Ultima fonte lead:</strong> attribuisce la call all'ultima fonte del lead (comportamento standard).<br /><br />
                        <strong>Fonte calendario:</strong> attribuisce la call alla fonte del calendario da cui è stata effettivamente prenotata.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={(!filters.callAttributionMode || filters.callAttributionMode === 'ultima_fonte') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onFiltersChange({ ...filters, callAttributionMode: 'ultima_fonte' })}
                  className="text-xs h-8"
                >
                  Ultima fonte lead
                </Button>
                <Button
                  variant={filters.callAttributionMode === 'fonte_calendario' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onFiltersChange({ ...filters, callAttributionMode: 'fonte_calendario' })}
                  className="text-xs h-8"
                >
                  Fonte calendario
                </Button>
              </div>
            </div>

            {/* Source filters inline */}
            <ReportSourceFilters
              sourceMode={filters.sourceMode || 'exclude'}
              onSourceModeChange={handleSourceModeChange}
              fontiIncluse={filters.fontiIncluse || []}
              fontiEscluse={filters.fontiEscluse || []}
              onFontiIncluseChange={handleFontiIncluseChange}
              onFontiEscluseChange={handleFontiEscluseChange}
              onClearSourceFilters={handleClearSourceFilters}
              inline
            />
          </div>
        </div>

        {/* Apply button bar */}
        <div className="border-t border-border/60 p-3 sm:p-4">
          <Button onClick={onApplyFilters} className="w-full h-9 rounded-xl text-sm">
            <CalendarIcon className="h-3.5 w-3.5 mr-2" />
            Applica Filtri
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportFiltersComponent;
