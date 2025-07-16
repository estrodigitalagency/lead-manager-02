
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { getAvailableFonti, getAvailableVenditori } from "@/services/reportsService";

interface DatabaseAdvancedFiltersProps {
  onApplyFilters: (filters: Record<string, any>) => void;
  tableName: 'lead_generation' | 'booked_call' | 'lead_lavorati';
}

const DatabaseAdvancedFilters = ({ onApplyFilters, tableName }: DatabaseAdvancedFiltersProps) => {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [venditori, setVenditori] = useState<string[]>([]);
  const [fonti, setFonti] = useState<string[]>([]);
  const [calendarView, setCalendarView] = useState<"from" | "to" | null>(null);

  useEffect(() => {
    const loadOptions = async () => {
      const [availableVenditori, availableFonti] = await Promise.all([
        getAvailableVenditori(),
        getAvailableFonti()
      ]);
      setVenditori(availableVenditori);
      setFonti(availableFonti);
    };

    loadOptions();
  }, []);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyFilters = () => {
    onApplyFilters(filters);
  };

  const clearFilters = () => {
    setFilters({});
    onApplyFilters({});
  };

  const handleVenditoreChange = (value: string) => {
    if (value === 'all-venditori') {
      const newFilters = { ...filters };
      delete newFilters.venditore;
      setFilters(newFilters);
    } else {
      handleFilterChange('venditore', value);
    }
  };

  const handleSourceModeChange = (mode: 'include' | 'exclude') => {
    handleFilterChange('sourceMode', mode);
  };

  const handleAddFonte = (fonte: string, mode: 'include' | 'exclude') => {
    const key = mode === 'include' ? 'fontiIncluse' : 'fontiEscluse';
    const currentFonti = filters[key] || [];
    
    if (!currentFonti.includes(fonte)) {
      handleFilterChange(key, [...currentFonti, fonte]);
    }
  };

  const handleRemoveFonte = (fonte: string, mode: 'include' | 'exclude') => {
    const key = mode === 'include' ? 'fontiIncluse' : 'fontiEscluse';
    const currentFonti = filters[key] || [];
    handleFilterChange(key, currentFonti.filter((f: string) => f !== fonte));
  };

  const sourceMode = filters.sourceMode || 'exclude';
  const fontiIncluse = filters.fontiIncluse || [];
  const fontiEscluse = filters.fontiEscluse || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtri Avanzati
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtri Base */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              placeholder="Cerca per nome..."
              value={filters.nome || ''}
              onChange={(e) => handleFilterChange('nome', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="Cerca per email..."
              value={filters.email || ''}
              onChange={(e) => handleFilterChange('email', e.target.value)}
            />
          </div>
        </div>

        {/* Periodo */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Periodo</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Data Inizio</Label>
              <Popover open={calendarView === "from"} onOpenChange={() => 
                setCalendarView(calendarView === "from" ? null : "from")
              }>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dataInizio ? format(new Date(filters.dataInizio), "dd/MM/yyyy", { locale: it }) : "Da data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dataInizio ? new Date(filters.dataInizio) : undefined}
                    onSelect={(date) => {
                      handleFilterChange("dataInizio", date ? date.toISOString().split('T')[0] : null);
                      setCalendarView(null);
                    }}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Data Fine</Label>
              <Popover open={calendarView === "to"} onOpenChange={() => 
                setCalendarView(calendarView === "to" ? null : "to")
              }>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dataFine ? format(new Date(filters.dataFine), "dd/MM/yyyy", { locale: it }) : "A data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dataFine ? new Date(filters.dataFine) : undefined}
                    onSelect={(date) => {
                      handleFilterChange("dataFine", date ? date.toISOString().split('T')[0] : null);
                      setCalendarView(null);
                    }}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Venditore */}
        {(tableName === 'lead_generation' || tableName === 'lead_lavorati') && (
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
        )}

        {/* Filtri Fonte */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Filtri per Fonte</Label>
          
          {/* Modalità */}
          <div className="mb-3">
            <div className="flex gap-2">
              <Button
                variant={sourceMode === 'include' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSourceModeChange('include')}
              >
                Includi Solo
              </Button>
              <Button
                variant={sourceMode === 'exclude' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSourceModeChange('exclude')}
              >
                Escludi
              </Button>
            </div>
          </div>

          {/* Selezione fonte */}
          <div className="mb-3">
            <Select onValueChange={(fonte) => handleAddFonte(fonte, sourceMode)}>
              <SelectTrigger>
                <SelectValue placeholder={`Seleziona fonte da ${sourceMode === 'include' ? 'includere' : 'escludere'}`} />
              </SelectTrigger>
              <SelectContent>
                {fonti
                  .filter(fonte => {
                    const currentList = sourceMode === 'include' ? fontiIncluse : fontiEscluse;
                    return !currentList.includes(fonte);
                  })
                  .map((fonte) => (
                    <SelectItem key={fonte} value={fonte}>
                      {fonte}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fonti selezionate */}
          {(fontiIncluse.length > 0 || fontiEscluse.length > 0) && (
            <div>
              {fontiIncluse.length > 0 && (
                <div className="mb-2">
                  <Label className="text-xs text-green-600 mb-1 block">Fonti Incluse:</Label>
                  <div className="flex flex-wrap gap-1">
                    {fontiIncluse.map((fonte: string) => (
                      <Badge key={fonte} variant="secondary" className="bg-green-100 text-green-800">
                        {fonte}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                          onClick={() => handleRemoveFonte(fonte, 'include')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {fontiEscluse.length > 0 && (
                <div>
                  <Label className="text-xs text-red-600 mb-1 block">Fonti Escluse:</Label>
                  <div className="flex flex-wrap gap-1">
                    {fontiEscluse.map((fonte: string) => (
                      <Badge key={fonte} variant="secondary" className="bg-red-100 text-red-800">
                        {fonte}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                          onClick={() => handleRemoveFonte(fonte, 'exclude')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filtri specifici per tabella */}
        {tableName === 'lead_lavorati' && (
          <div>
            <Label htmlFor="esito">Esito</Label>
            <Select value={filters.esito || ''} onValueChange={(value) => handleFilterChange('esito', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona esito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tutti</SelectItem>
                <SelectItem value="interessato">Interessato</SelectItem>
                <SelectItem value="non_interessato">Non Interessato</SelectItem>
                <SelectItem value="callback">Callback</SelectItem>
                <SelectItem value="non_risponde">Non Risponde</SelectItem>
                <SelectItem value="vendita">Vendita</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Pulsanti */}
        <div className="flex gap-2 pt-4">
          <Button onClick={applyFilters} className="flex-1">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Applica Filtri
          </Button>
          <Button variant="outline" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DatabaseAdvancedFilters;
