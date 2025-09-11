import React, { createContext, useContext, useState, useEffect } from 'react';

interface MarketContextType {
  selectedMarket: 'IT' | 'ES';
  setSelectedMarket: (market: 'IT' | 'ES') => void;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to IT market per evitare problemi
  const [selectedMarket, setSelectedMarket] = useState<'IT' | 'ES'>('IT');

  // Persist market selection in localStorage
  useEffect(() => {
    const savedMarket = localStorage.getItem('selectedMarket');
    if (savedMarket === 'IT' || savedMarket === 'ES') {
      setSelectedMarket(savedMarket);
    }
  }, []);

  const handleSetMarket = (market: 'IT' | 'ES') => {
    setSelectedMarket(market);
    localStorage.setItem('selectedMarket', market);
  };

  return (
    <MarketContext.Provider value={{ 
      selectedMarket, 
      setSelectedMarket: handleSetMarket 
    }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = (): MarketContextType => {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
};