import React, { createContext, useContext, useState, useEffect } from 'react';

interface MarketContextType {
  selectedMarket: 'IT' | 'ES';
  setSelectedMarket: (market: 'IT' | 'ES') => void;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with null to avoid setting default before localStorage check
  const [selectedMarket, setSelectedMarket] = useState<'IT' | 'ES'>(() => {
    // Check localStorage during initialization
    const savedMarket = localStorage.getItem('selectedMarket');
    if (savedMarket === 'IT' || savedMarket === 'ES') {
      return savedMarket;
    }
    // Default to IT if no valid saved market
    return 'IT';
  });

  // Save to localStorage whenever market changes
  useEffect(() => {
    localStorage.setItem('selectedMarket', selectedMarket);
  }, [selectedMarket]);

  const handleSetMarket = (market: 'IT' | 'ES') => {
    setSelectedMarket(market);
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