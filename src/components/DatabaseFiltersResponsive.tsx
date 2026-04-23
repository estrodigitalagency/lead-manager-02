
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Filter, X, CalendarIcon, Search, User, Phone, Mail, Tag, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { getAvailableVenditori } from "@/services/reportsService";
import { getUniqueSourcesFromLeads, getAllCampagne, resolveCampagnaConfig } from "@/services/databaseService";
import { useMarket } from "@/contexts/MarketContext";
import { SearchableSourceSelect } from "@/components/ui/searchable-source-select";
import { Separator } from "@/components/ui/separator";

interface DatabaseFiltersResponsiveProps {
  onApplyFilters: (filters: Record<string, any>) => void;
  tableName: 'lead_generation' | 'booked_call' | 'lead_lavorati';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideButton?: boolean;
}

const DatabaseFiltersResponsive = ({ 
  onApplyFilters, 
  tableName,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideButton = false
}: DatabaseFiltersResponsiveProps) => {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;
  const [venditori, setVenditori] = useState<string[]>([]);
  const [fonti, setFonti] = useState<string[]>([]);
  const [campagne, setCampagne] = useState<string[]>([]);
  const [calendarView, setCalendarView] = useState<"from" | "to" | null>(null);
  const isMobile = useIsMobile();

  const { selectedMarket } = useMarket();

  useEffect(() => {
    const loadOptions = async () => {
      const [availableVenditori, availableFonti, availableCampagne] = await Promise.all([
        getAvailableVenditori(),
        getUniqueSourcesFromLeads(selectedMarket),
        getAllCampagne(selectedMarket)
      ]);
      setVenditori(availableVenditori);
      setFonti(availableFonti);
      setCampagne((availableCampagne as any[]).map((c: any) => c.nome).filter(Boolean).sort());
    };

    loadOptions();
  }, [selectedMarket]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyFilters = () => {
    setCalendarView(null);
    onApplyFilters(filters);
    setIsOpen(false);
  };

  const clearFilters = () => {
    setCalendarView(null);
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

  const getAvailableFontiForSelection = () => {
    const currentList = sourceMode === 'include' ? fontiIncluse : fontiEscluse;
    return fonti.filter(fonte => !currentList.includes(fonte)).sort();
  };

  const activeFiltersCount = Object.keys(filters).filter(k => {
    const v = filters[k];
    if (k === 'sourceMode') return false;
    if (k === 'bookedCall' && v === 'all') return false;
    if (Array.isArray(v)) return v.length > 0;
    return v !== '' && v !== undefined && v !== null;
  }).length;

  const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <Label className="text-sm font-semibold tracking-tight">{title}</Label>
    </div>
  );

  const FilterContent = () => (
    <div className="space-y-5">
      {/* Periodo */}
      <div>
        <SectionHeader icon={CalendarIcon} title="Periodo" />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Da</Label>
            <Popover open={calendarView === "from"} onOpenChange={() => 
              setCalendarView(calendarView === "from" ? null : "from")
            }>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal h-9">
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span className={filters.dataInizio ? "text-foreground" : "text-muted-foreground"}>
                    {filters.dataInizio ? format(new Date(filters.dataInizio), "dd/MM/yyyy", { locale: it }) : "Inizio"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[60]">
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
            <Label className="text-xs text-muted-foreground mb-1 block">A</Label>
            <Popover open={calendarView === "to"} onOpenChange={() => 
              setCalendarView(calendarView === "to" ? null : "to")
            }>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal h-9">
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span className={filters.dataFine ? "text-foreground" : "text-muted-foreground"}>
                    {filters.dataFine ? format(new Date(filters.dataFine), "dd/MM/yyyy", { locale: it }) : "Fine"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[60]">
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

      <Separator className="opacity-50" />

      {/* Ricerca */}
      <div>
        <SectionHeader icon={Search} title="Ricerca" />
        <div className="space-y-2">
          <div className="relative">
            <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Nome..."
              value={filters.nome || ''}
              onChange={(e) => handleFilterChange('nome', e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Email..."
              value={filters.email || ''}
              onChange={(e) => handleFilterChange('email', e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Telefono..."
              value={filters.telefono || ''}
              onChange={(e) => handleFilterChange('telefono', e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* Venditore & Call Prenotata */}
      {(tableName === 'lead_generation' || tableName === 'lead_lavorati') && (
        <>
          <div>
            <SectionHeader icon={User} title="Venditore" />
            <Select
              value={filters.venditore || 'all-venditori'}
              onValueChange={handleVenditoreChange}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Tutti i venditori" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                <SelectItem value="all-venditori">Tutti i venditori</SelectItem>
                {venditori.map((venditore) => (
                  <SelectItem key={venditore} value={venditore}>
                    {venditore}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator className="opacity-50" />
        </>
      )}

      {/* Campagna */}
      <div>
        <SectionHeader icon={Tag} title="Campagna" />
        <Select
          value={filters.campagna || 'all-campagne'}
          onValueChange={async (value) => {
            if (value === 'all-campagne') {
              const { campagna, ...rest } = filters;
              setFilters(rest);
              return;
            }
            // Carica config campagna e popola i filtri fonte visibili
            const config = await resolveCampagnaConfig(selectedMarket, value);
            setFilters(prev => {
              const next = { ...prev, campagna: value };
              if (config) {
                next.sourceMode = config.source_mode || 'exclude';
                next.fontiIncluse = config.fonti_incluse || [];
                next.fontiEscluse = config.fonti_escluse || [];
              }
              return next;
            });
          }}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Tutte le campagne" />
          </SelectTrigger>
          <SelectContent className="z-[60]">
            <SelectItem value="all-campagne">Tutte le campagne</SelectItem>
            {campagne.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Separator className="opacity-50" />

      {/* Call Prenotata */}
      {tableName === 'lead_generation' && (
        <>
          <div>
            <SectionHeader icon={CheckCircle} title="Call Prenotata" />
            <div className="flex gap-2">
              {['all', 'SI', 'NO'].map((val) => {
                const isActive = (filters.bookedCall || 'all') === val;
                const label = val === 'all' ? 'Tutte' : val;
                return (
                  <Button
                    key={val}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    className={`flex-1 h-9 text-sm ${isActive ? '' : 'text-muted-foreground'}`}
                    onClick={() => handleFilterChange('bookedCall', val)}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
          <Separator className="opacity-50" />
        </>
      )}

      {/* Fonti */}
      <div>
        <SectionHeader icon={Tag} title="Fonte" />
        
        <div className="flex gap-1.5 mb-3">
          <Button
            variant={sourceMode === 'include' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSourceModeChange('include')}
            className="flex-1 h-8 text-xs"
          >
            Includi
          </Button>
          <Button
            variant={sourceMode === 'exclude' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSourceModeChange('exclude')}
            className="flex-1 h-8 text-xs"
          >
            Escludi
          </Button>
        </div>

        <SearchableSourceSelect
          sources={getAvailableFontiForSelection()}
          onSelect={(fonte) => handleAddFonte(fonte, sourceMode)}
          placeholder={`Cerca fonte...`}
          emptyMessage="Nessuna fonte trovata"
        />

        {(fontiIncluse.length > 0 || fontiEscluse.length > 0) && (
          <div className="mt-3 space-y-2">
            {fontiIncluse.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Incluse:</Label>
                <div className="flex flex-wrap gap-1">
                  {fontiIncluse.map((fonte: string) => (
                    <Badge key={fonte} variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-xs py-0.5">
                      {fonte}
                      <button
                        className="ml-1 hover:text-destructive transition-colors"
                        onClick={() => handleRemoveFonte(fonte, 'include')}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {fontiEscluse.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Escluse:</Label>
                <div className="flex flex-wrap gap-1">
                  {fontiEscluse.map((fonte: string) => (
                    <Badge key={fonte} variant="secondary" className="bg-destructive/10 text-destructive border border-destructive/20 text-xs py-0.5">
                      {fonte}
                      <button
                        className="ml-1 hover:text-foreground transition-colors"
                        onClick={() => handleRemoveFonte(fonte, 'exclude')}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
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
        <>
          <Separator className="opacity-50" />
          <div>
            <SectionHeader icon={CheckCircle} title="Esito" />
            <Select value={filters.esito || ''} onValueChange={(value) => handleFilterChange('esito', value)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Tutti gli esiti" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                <SelectItem value="">Tutti</SelectItem>
                <SelectItem value="interessato">Interessato</SelectItem>
                <SelectItem value="non_interessato">Non Interessato</SelectItem>
                <SelectItem value="callback">Callback</SelectItem>
                <SelectItem value="non_risponde">Non Risponde</SelectItem>
                <SelectItem value="vendita">Vendita</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Azioni */}
      <div className="flex gap-2 pt-3 border-t border-border/50 sticky bottom-0 bg-background pb-1">
        <Button onClick={applyFilters} className="flex-1 h-10">
          <Filter className="h-4 w-4 mr-2" />
          Applica
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-primary-foreground text-xs px-1.5 py-0">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
        <Button variant="outline" onClick={clearFilters} size="icon" className="h-10 w-10 shrink-0">
          <X className="h-4 w-4" />
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
            <SheetTitle className="text-lg">Filtri Database</SheetTitle>
            <SheetDescription className="text-xs">
              Raffina la ricerca con i filtri sottostanti
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
    <Dialog open={isOpen} onOpenChange={setIsOpen} modal={false}>
      {!hideButton && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Filter className="h-4 w-4" />
            Filtri
          </Button>
        </DialogTrigger>
      )}
      <DialogContent 
        className="max-w-md max-h-[85vh] p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-5 pb-3 border-b border-border/50">
          <DialogTitle className="text-lg">Filtri Database</DialogTitle>
          <DialogDescription className="text-xs">
            Raffina la ricerca con i filtri sottostanti
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[calc(85vh-100px)] px-5 py-4">
          <FilterContent />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DatabaseFiltersResponsive;
