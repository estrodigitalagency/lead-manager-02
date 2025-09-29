import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { Languages } from "lucide-react";

interface LanguageSelectorProps {
  variant?: 'default' | 'mobile';
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = 'default' }) => {
  const { selectedLanguage, setSelectedLanguage } = useLanguage();
  
  if (variant === 'mobile') {
    return (
      <Select value={selectedLanguage} onValueChange={(value: 'IT' | 'ES') => setSelectedLanguage(value)}>
        <SelectTrigger className="w-10 h-10 p-0 border-none bg-transparent hover:bg-muted/50 flex items-center justify-center">
          <Languages className="h-5 w-5 text-muted-foreground" />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem value="IT">🇮🇹 Italiano</SelectItem>
          <SelectItem value="ES">🇪🇸 Español</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-transparent">
      <Select value={selectedLanguage} onValueChange={(value: 'IT' | 'ES') => setSelectedLanguage(value)}>
        <SelectTrigger className="w-auto h-10 px-3 py-2 text-sm bg-primary/20 border-primary/30 text-primary font-medium hover:bg-primary/30">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="IT">🇮🇹 Italiano</SelectItem>
          <SelectItem value="ES">🇪🇸 Español</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSelector;