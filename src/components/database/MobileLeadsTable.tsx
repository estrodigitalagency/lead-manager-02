
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Phone, Mail, Calendar, User, Info } from "lucide-react";
import { Lead } from "@/types/lead";
import FonteDisplay from "./FonteDisplay";
import { getLeadStatus } from "@/utils/leadStatus";

interface MobileLeadsTableProps {
  leads: Lead[];
  selectedItems: string[];
  onSelectionChange: (selected: string[]) => void;
  onDelete: (id: string) => void;
  onShowDetails: (lead: Lead) => void;
}

const MobileLeadsTable = ({ 
  leads, 
  selectedItems, 
  onSelectionChange, 
  onDelete,
  onShowDetails
}: MobileLeadsTableProps) => {
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

  if (leads.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Nessun lead trovato.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leads.map((lead) => {
        const status = getLeadStatus(lead);
        
        return (
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
                    <div className="flex items-center gap-1 mb-1">
                      <Badge variant="outline" className={`text-xs ${status.className}`}>
                        {status.label}
                      </Badge>
                      {lead.booked_call === "SI" && (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs">
                          Call Prenotata
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onShowDetails(lead)}
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-2"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(lead.id!)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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

                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">
                    {formatDate(lead.created_at)}
                  </span>
                </div>

                {lead.fonte && (
                  <div className="mt-2">
                    <FonteDisplay fonte={lead.fonte} />
                  </div>
                )}

                {lead.venditore && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Venditore: {lead.venditore}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MobileLeadsTable;
