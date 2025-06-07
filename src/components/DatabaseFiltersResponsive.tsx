
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Filter, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface DatabaseFiltersResponsiveProps {
  onApplyFilters: (filters: Record<string, any>) => void;
  tableName: 'lead_generation' | 'booked_call' | 'lead_lavorati';
}

const DatabaseFiltersResponsive = ({ onApplyFilters, tableName }: DatabaseFiltersResponsiveProps) => {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

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

  const FilterContent = () => (
    <div className="space-y-4 p-1">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dataInizio">Data Inizio</Label>
          <Input
            id="dataInizio"
            type="date"
            value={filters.dataInizio || ''}
            onChange={(e) => handleFilterChange('dataInizio', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="dataFine">Data Fine</Label>
          <Input
            id="dataFine"
            type="date"
            value={filters.dataFine || ''}
            onChange={(e) => handleFilterChange('dataFine', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            placeholder="Cerca per nome..."
            value={filters.nome || ''}
            onChange={(e) => handleFilterChange('nome', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            placeholder="Cerca per email..."
            value={filters.email || ''}
            onChange={(e) => handleFilterChange('email', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefono">Telefono</Label>
          <Input
            id="telefono"
            placeholder="Cerca per telefono..."
            value={filters.telefono || ''}
            onChange={(e) => handleFilterChange('telefono', e.target.value)}
          />
        </div>

        {tableName === 'lead_generation' && (
          <div className="space-y-2">
            <Label htmlFor="venditore">Venditore</Label>
            <Input
              id="venditore"
              placeholder="Cerca per venditore..."
              value={filters.venditore || ''}
              onChange={(e) => handleFilterChange('venditore', e.target.value)}
            />
          </div>
        )}

        {tableName === 'lead_lavorati' && (
          <div className="space-y-2">
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
      </div>

      <div className="flex gap-2 pt-4">
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
        <SheetContent side="bottom" className="h-[90vh]">
          <SheetHeader>
            <SheetTitle>Filtri Database</SheetTitle>
            <SheetDescription>
              Applica filtri per raffinare la ricerca
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 overflow-y-auto max-h-[calc(90vh-120px)]">
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
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filtri Database</DialogTitle>
          <DialogDescription>
            Applica filtri per raffinare la ricerca
          </DialogDescription>
        </DialogHeader>
        <FilterContent />
      </DialogContent>
    </Dialog>
  );
};

export default DatabaseFiltersResponsive;
