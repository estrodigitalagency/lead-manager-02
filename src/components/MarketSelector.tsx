import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMarket } from "@/contexts/MarketContext";
const MarketSelector = () => {
  const {
    selectedMarket,
    setSelectedMarket
  } = useMarket();
  return <div className="flex items-center gap-2 bg-transparent">
      
      <Select value={selectedMarket} onValueChange={(value: 'IT' | 'ES') => setSelectedMarket(value)}>
        <SelectTrigger className="w-auto h-10 px-3 py-2 text-sm bg-primary/20 border-primary/30 text-primary font-medium hover:bg-primary/30">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="IT">🇮🇹 IT</SelectItem>
          <SelectItem value="ES">🇪🇸 ES</SelectItem>
        </SelectContent>
      </Select>
    </div>;
};
export default MarketSelector;