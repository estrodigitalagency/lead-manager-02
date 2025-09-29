import React, { createContext, useContext, useState, useEffect } from 'react';

interface LanguageContextType {
  selectedLanguage: 'IT' | 'ES';
  setSelectedLanguage: (language: 'IT' | 'ES') => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with localStorage check
  const [selectedLanguage, setSelectedLanguage] = useState<'IT' | 'ES'>(() => {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (savedLanguage === 'IT' || savedLanguage === 'ES') {
      return savedLanguage;
    }
    // Default to IT if no valid saved language
    return 'IT';
  });

  // Save to localStorage whenever language changes
  useEffect(() => {
    localStorage.setItem('selectedLanguage', selectedLanguage);
  }, [selectedLanguage]);

  const handleSetLanguage = (language: 'IT' | 'ES') => {
    setSelectedLanguage(language);
  };

  return (
    <LanguageContext.Provider value={{ 
      selectedLanguage, 
      setSelectedLanguage: handleSetLanguage 
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};