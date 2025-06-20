
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Filter, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { getAvailableFonti, getAvailableVenditori } from "@/services/reportsService";

interface DatabaseFiltersResponsiveProps {
  onApplyFilters: (filters: Record<string, any>) => void;
  tableName: 'lead_generation' | 'booked_call' | 'lead_lavorati';
}

const DatabaseFiltersResponsive = ({ onApplyFilters, tableName }: DatabaseFiltersResponsiveProps) => {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [venditori, setVenditori] = useState<string[]>([]);
  const [fonti, setFonti] = useState<string[]>([]);
  const isMobile = useIsMobile();

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
    setIsOpen(false);
  };

  const clearFilters = () => {
    setFilters({});
    onApplyFilters({});
    setIsOpen(false);
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

  const FilterContent = () => (
    <div className="space-y-4 p-2">
      <div className="space-y-4">
        {/* Periodo */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Periodo</Label>
          <div className="space-y-2">
            <div>
              <Label htmlFor="dataInizio" className="text-xs">Data Inizio</Label>
              <Input
                id="dataInizio"
                type="date"
                value={filters.dataInizio || ''}
                onChange={(e) => handleFilterChange('dataInizio', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dataFine" className="text-xs">Data Fine</Label>
              <Input
                id="dataFine"
                type="date"
                value={filters.dataFine || ''}
                onChange={(e) => handleFilterChange('dataFine', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Ricerca testo */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Ricerca Testo</Label>
          <div className="space-y-2">
            <div>
              <Label htmlFor="nome" className="text-xs">Nome</Label>
              <Input
                id="nome"
                placeholder="Cerca per nome..."
                value={filters.nome || ''}
                onChange={(e) => handleFilterChange('nome', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                placeholder="Cerca per email..."
                value={filters.email || ''}
                onChange={(e) => handleFilterChange('email', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="telefono" className="text-xs">Telefono</Label>
              <Input
                id="telefono"
                placeholder="Cerca per telefono..."
                value={filters.telefono || ''}
                onChange={(e) => handleFilterChange('telefono', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Venditore */}
        {(tableName === 'lead_generation' || tableName === 'lead_lavorati') && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Venditore</Label>
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
        <div className="space-y-3">
          <Label className="text-sm font-medium">Filtri per Fonte</Label>
          
          {/* Modalità */}
          <div className="flex gap-2">
            <Button
              variant={sourceMode === 'include' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSourceModeChange('include')}
              className="flex-1"
            >
              Includi Solo
            </Button>
            <Button
              variant={sourceMode === 'exclude' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSourceModeChange('exclude')}
              className="flex-1"
            >
              Escludi
            </Button>
          </div>

          {/* Selezione fonte */}
          <Select onValueChange={(fonte) => handleAddFonte(fonte, sourceMode)}>
            <SelectTrigger>
              <SelectValue placeholder={`Fonte da ${sourceMode === 'include' ? 'includere' : 'escludere'}`} />
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

          {/* Fonti selezionate */}
          {(fontiIncluse.length > 0 || fontiEscluse.length > 0) && (
            <div className="space-y-2">
              {fontiIncluse.length > 0 && (
                <div>
                  <Label className="text-xs text-green-600 mb-1 block">Incluse:</Label>
                  <div className="flex flex-wrap gap-1">
                    {fontiIncluse.map((fonte: string) => (
                      <Badge key={fonte} variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        {fonte}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-3 w-3 p-0 ml-1 hover:bg-transparent"
                          onClick={() => handleRemoveFonte(fonte, 'include')}
                        >
                          <X className="h-2 w-2" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {fontiEscluse.length > 0 && (
                <div>
                  <Label className="text-xs text-red-600 mb-1 block">Escluse:</Label>
                  <div className="flex flex-wrap gap-1">
                    {fontiEscluse.map((fonte: string) => (
                      <Badge key={fonte} variant="secondary" className="bg-red-100 text-red-800 text-xs">
                        {fonte}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-3 w-3 p-0 ml-1 hover:bg-transparent"
                          onClick={() => handleRemoveFonte(fonte, 'exclude')}
                        >
                          <X className="h-2 w-2" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Esito per lead lavorati */}
        {tableName === 'lead_lavorati' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Esito</Label>
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
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={applyFilters} className="flex-1">
          Applica Filtri
        </Button>
        <Button variant="outline" onClick={clearFilters} className="flex-1">
          <X className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Filter className="h-4 w-4" />
            Filtri
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] p-0">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle>Filtri Database</SheetTitle>
            <SheetDescription>
              Applica filtri per raffinare la ricerca
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto h-[calc(85vh-80px)] px-4 pb-4">
            <FilterContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Filter className="h-4 w-4" />
          Filtri
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Filtri Database</DialogTitle>
          <DialogDescription>
            Applica filtri per raffinare la ricerca
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] px-6 pb-6">
          <FilterContent />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DatabaseFiltersResponsive;
