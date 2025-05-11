
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface FilterOptions {
  nome?: string;
  email?: string;
  telefono?: string;
  venditore?: string;
  dataInizio?: Date;
  dataFine?: Date;
  campagna?: string;
  esito?: string;
}

interface DatabaseFiltersProps {
  onApplyFilters: (filters: FilterOptions) => void;
  tableName: string;
}

export default function DatabaseFilters({ onApplyFilters, tableName }: DatabaseFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [isOpen, setIsOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<"from" | "to" | null>(null);

  const handleFilterChange = (field: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({});
    onApplyFilters({});
  };

  const applyFilters = () => {
    onApplyFilters(filters);
    setIsOpen(false);
  };

  return (
    <div>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filtra dati</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-96 p-4">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Filtri</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2 text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Azzera
            </Button>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  placeholder="Filtra per nome"
                  value={filters.nome || ""}
                  onChange={(e) => handleFilterChange("nome", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="Filtra per email"
                  value={filters.email || ""}
                  onChange={(e) => handleFilterChange("email", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="telefono">Telefono</Label>
                <Input
                  id="telefono"
                  placeholder="Filtra per telefono"
                  value={filters.telefono || ""}
                  onChange={(e) => handleFilterChange("telefono", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="venditore">Venditore</Label>
                <Input
                  id="venditore"
                  placeholder="Filtra per venditore"
                  value={filters.venditore || ""}
                  onChange={(e) => handleFilterChange("venditore", e.target.value)}
                />
              </div>

              {tableName === "lead_generation" && (
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="campagna">Campagna</Label>
                  <Input
                    id="campagna"
                    placeholder="Filtra per campagna"
                    value={filters.campagna || ""}
                    onChange={(e) => handleFilterChange("campagna", e.target.value)}
                  />
                </div>
              )}

              {tableName === "lead_lavorati" && (
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="esito">Esito</Label>
                  <Input
                    id="esito"
                    placeholder="Filtra per esito"
                    value={filters.esito || ""}
                    onChange={(e) => handleFilterChange("esito", e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Data inizio</Label>
                  <Popover open={calendarView === "from"} onOpenChange={() => 
                    setCalendarView(calendarView === "from" ? null : "from")
                  }>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {filters.dataInizio ? format(filters.dataInizio, "dd/MM/yyyy", { locale: it }) : "Da data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dataInizio}
                        onSelect={(date) => {
                          handleFilterChange("dataInizio", date);
                          setCalendarView(null);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Data fine</Label>
                  <Popover open={calendarView === "to"} onOpenChange={() => 
                    setCalendarView(calendarView === "to" ? null : "to")
                  }>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {filters.dataFine ? format(filters.dataFine, "dd/MM/yyyy", { locale: it }) : "A data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dataFine}
                        onSelect={(date) => {
                          handleFilterChange("dataFine", date);
                          setCalendarView(null);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={applyFilters}>
                  Applica Filtri
                </Button>
              </div>
            </div>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
