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
        <SelectTrigger className="w-20 h-8 text-sm">
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