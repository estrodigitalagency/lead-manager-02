
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchInputProps {
  onSearch: (searchTerm: string) => void;
  placeholder?: string;
}

const SearchInput = ({ onSearch, placeholder = "Cerca per nome, numero o email..." }: SearchInputProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Debounce search term per evitare troppe chiamate
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Effettua la ricerca quando il termine debounced cambia
  React.useEffect(() => {
    onSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);

  const handleSearch = () => {
    onSearch(searchTerm);
  };

  const handleClear = () => {
    setSearchTerm("");
    // La ricerca vuota sarà triggerata dal debounce
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Non chiamiamo più onSearch direttamente - sarà gestito dal debounce
  };

  return (
    <div className="flex items-center gap-2 max-w-md">
      <div className="relative flex-1">
        <Input
          value={searchTerm}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="pr-8"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={handleSearch}>
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default SearchInput;
