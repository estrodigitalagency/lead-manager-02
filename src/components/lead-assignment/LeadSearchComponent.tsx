import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Search, User, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Lead {
  id: string;
  nome: string;
  cognome?: string;
  email?: string;
  telefono?: string;
  fonte?: string;
  lead_score?: string;
  created_at: string;
  venditore?: string;
  stato?: string;
}

interface LeadSearchComponentProps {
  onLeadFound: (lead: Lead) => void;
}

export const LeadSearchComponent: React.FC<LeadSearchComponentProps> = ({ onLeadFound }) => {
  const [searchType, setSearchType] = useState<'email' | 'telefono' | 'nome'>('email');
  const [searchValue, setSearchValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [foundLead, setFoundLead] = useState<Lead | null>(null);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast.error("Inserisci un valore di ricerca");
      return;
    }

    setIsSearching(true);
    try {
      let query = supabase
        .from('lead_generation')
        .select('*')
        .order('created_at', { ascending: false });

      // Applica il filtro in base al tipo di ricerca
      switch (searchType) {
        case 'email':
          query = query.eq('email', searchValue.trim());
          break;
        case 'telefono':
          query = query.eq('telefono', searchValue.trim());
          break;
        case 'nome':
          // Cerca per nome OR cognome (case insensitive)
          const searchTerm = searchValue.trim().toLowerCase();
          query = query.or(`nome.ilike.%${searchTerm}%,cognome.ilike.%${searchTerm}%`);
          break;
      }

      const { data: leads, error } = await query.limit(1);

      if (error) {
        console.error('Errore ricerca lead:', error);
        toast.error("Errore durante la ricerca");
        return;
      }

      if (!leads || leads.length === 0) {
        toast.error(`Nessun lead trovato con questo ${searchType}`);
        setFoundLead(null);
        return;
      }

      const lead = leads[0];
      setFoundLead(lead);
      onLeadFound(lead);
      toast.success("Lead trovato!");

    } catch (error) {
      console.error('Errore ricerca:', error);
      toast.error("Errore durante la ricerca");
    } finally {
      setIsSearching(false);
    }
  };

  const getSearchIcon = () => {
    switch (searchType) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'telefono': return <Phone className="h-4 w-4" />;
      case 'nome': return <User className="h-4 w-4" />;
    }
  };

  const getPlaceholder = () => {
    switch (searchType) {
      case 'email': return "Inserisci l'email del lead...";
      case 'telefono': return "Inserisci il telefono del lead...";
      case 'nome': return "Inserisci nome o cognome del lead...";
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Ricerca Lead
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo di ricerca</Label>
            <Select value={searchType} onValueChange={(value: 'email' | 'telefono' | 'nome') => {
              setSearchType(value);
              setSearchValue("");
              setFoundLead(null);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                </SelectItem>
                <SelectItem value="telefono">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefono
                  </div>
                </SelectItem>
                <SelectItem value="nome">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nome/Cognome
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valore da cercare</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  {getSearchIcon()}
                </div>
                <Input
                  type={searchType === 'email' ? 'email' : searchType === 'telefono' ? 'tel' : 'text'}
                  placeholder={getPlaceholder()}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-10"
                  disabled={isSearching}
                />
              </div>
              <Button 
                onClick={handleSearch}
                disabled={isSearching || !searchValue.trim()}
                className="px-6"
              >
                {isSearching ? "Ricerca..." : "Cerca"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {foundLead && (
        <Alert className="bg-primary/10 border-primary/30">
          <User className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-foreground">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Lead trovato:</p>
                {foundLead.venditore && (
                  <Badge variant="secondary" className="text-xs">
                    Già assegnato a: {foundLead.venditore}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 gap-1 text-sm">
                <p><strong>Nome:</strong> {foundLead.nome} {foundLead.cognome || ''}</p>
                {foundLead.email && <p><strong>Email:</strong> {foundLead.email}</p>}
                {foundLead.telefono && <p><strong>Telefono:</strong> {foundLead.telefono}</p>}
                {foundLead.fonte && <p><strong>Fonte:</strong> {foundLead.fonte}</p>}
                {foundLead.lead_score && <p><strong>Lead Score:</strong> {foundLead.lead_score}</p>}
                <p><strong>Creato il:</strong> {new Date(foundLead.created_at).toLocaleDateString('it-IT')}</p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};