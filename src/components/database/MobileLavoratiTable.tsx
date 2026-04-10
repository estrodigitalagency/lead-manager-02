
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Phone, Mail, Calendar, User, Target } from "lucide-react";
import { LeadLavorato } from "@/types/leadLavorato";

interface MobileLavoratiTableProps {
  leadLavorati: LeadLavorato[];
  selectedItems: string[];
  onSelectionChange: (selected: string[]) => void;
  onDelete: (id: string) => void;
}

const MobileLavoratiTable = ({ 
  leadLavorati, 
  selectedItems, 
  onSelectionChange, 
  onDelete 
}: MobileLavoratiTableProps) => {
  const handleItemSelect = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedItems, id]);
    } else {
      onSelectionChange(selectedItems.filter(item => item !== id));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEsitoBadge = (esito: string | null) => {
    if (!esito) return null;
    
    const esitoLower = esito.toLowerCase();
    let className = "text-xs";
    
    if (esitoLower.includes('vendita') || esitoLower.includes('chiuso')) {
      className += " bg-green-500/15 text-green-400 border-green-500/30";
    } else if (esitoLower.includes('interessato') || esitoLower.includes('ricontattare')) {
      className += " bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
    } else if (esitoLower.includes('non interessato') || esitoLower.includes('rifiutato')) {
      className += " bg-destructive/10 text-destructive border-destructive/30";
    } else {
      className += " bg-muted text-muted-foreground border-border";
    }
    
    return (
      <Badge variant="outline" className={className}>
        {esito}
      </Badge>
    );
  };

  if (leadLavorati.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Nessun lead lavorato trovato.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leadLavorati.map((lead) => (
        <Card key={lead.id} className="border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedItems.includes(lead.id!)}
                  onCheckedChange={(checked) => handleItemSelect(lead.id!, !!checked)}
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {lead.nome} {lead.cognome || ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getEsitoBadge(lead.esito)}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(lead.id!)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 p-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2 text-sm">
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground truncate">{lead.email}</span>
                </div>
              )}
              
              {lead.telefono && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{lead.telefono}</span>
                </div>
              )}

              {lead.data_contatto && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">
                    Contattato: {formatDate(lead.data_contatto)}
                  </span>
                </div>
              )}

              {lead.data_call && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">
                    Call: {formatDate(lead.data_call)}
                  </span>
                </div>
              )}

              {lead.venditore && (
                <div className="text-xs text-muted-foreground mt-2">
                  Venditore: {lead.venditore}
                </div>
              )}

              {lead.obiezioni && (
                <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  Obiezioni: {lead.obiezioni}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MobileLavoratiTable;
