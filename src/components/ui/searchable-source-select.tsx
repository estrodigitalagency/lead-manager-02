import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

interface SearchableSourceSelectProps {
  sources: string[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSourceSelect({
  sources,
  selectedValue = "",
  onSelect,
  placeholder = "Seleziona una fonte...",
  emptyMessage = "Nessuna fonte trovata",
  className,
  disabled = false,
}: SearchableSourceSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const isMobile = useIsMobile();

  const filteredSources = React.useMemo(() => {
    if (!searchQuery) return sources;
    const query = searchQuery.toLowerCase();
    return sources.filter((source) =>
      source.toLowerCase().includes(query)
    );
  }, [sources, searchQuery]);

  const handleSelect = (value: string) => {
    onSelect(value);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedValue && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {selectedValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Cerca fonte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList className={isMobile ? "max-h-[200px]" : "max-h-[300px]"}>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {filteredSources.map((source) => (
                <CommandItem
                  key={source}
                  value={source}
                  onSelect={() => handleSelect(source)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValue === source ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{source}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
