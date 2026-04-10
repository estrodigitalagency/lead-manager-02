
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Info, ShoppingCart } from "lucide-react";
import { Lead } from "@/types/lead";
import FonteDisplay from "./FonteDisplay";
import { useLeadStatus } from "@/hooks/useLeadStatus";
import { useMemo } from "react";

interface LeadTableRowProps {
  lead: Lead;
  isSelected: boolean;
  visibleColumns: string[];
  onSelect: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
  onShowDetails: (lead: Lead) => void;
  onToggleManuallyNotAssignable: (id: string, currentValue: boolean) => void;
}

const LeadTableRow = ({
  lead,
  isSelected,
  visibleColumns,
  onSelect,
  onDelete,
  onShowDetails,
  onToggleManuallyNotAssignable
}: LeadTableRowProps) => {
  const { getStatus } = useLeadStatus();

  // OTTIMIZZAZIONE: Memoizza il calcolo dello stato per evitare ricalcoli inutili
  const status = useMemo(() => getStatus(lead), [lead, getStatus]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(lead.id!, !!checked)}
        />
      </TableCell>
      
      {visibleColumns.includes('data') && (
        <TableCell className="text-sm">
          {formatDate(lead.created_at)}
        </TableCell>
      )}
      
      {visibleColumns.includes('nome') && (
        <TableCell className="font-medium text-sm">
          {lead.nome}
        </TableCell>
      )}
      
      {visibleColumns.includes('cognome') && (
        <TableCell className="text-sm">
          {lead.cognome || '-'}
        </TableCell>
      )}
      
      {visibleColumns.includes('email') && (
        <TableCell className="text-sm max-w-[200px] truncate">
          {lead.email || '-'}
        </TableCell>
      )}
      
      {visibleColumns.includes('telefono') && (
        <TableCell className="text-sm">
          {lead.telefono || '-'}
        </TableCell>
      )}
      
      {visibleColumns.includes('fonte') && (
        <TableCell className="text-sm">
          <FonteDisplay fonte={lead.fonte} />
        </TableCell>
      )}
      
      {visibleColumns.includes('ultima_fonte') && (
        <TableCell className="text-sm">
          <FonteDisplay fonte={lead.ultima_fonte} />
        </TableCell>
      )}
      
      {visibleColumns.includes('lead_score') && (
        <TableCell className="text-sm">
          {lead.lead_score || '-'}
        </TableCell>
      )}

      {visibleColumns.includes('booked_call') && (
        <TableCell className="text-sm">
          <Badge variant="outline" className={lead.booked_call === 'SI' ? 'bg-green-500/15 text-green-400' : 'bg-muted text-muted-foreground'}>
            {lead.booked_call === 'SI' ? 'Sì' : 'No'}
          </Badge>
        </TableCell>
      )}
      
      {visibleColumns.includes('stato') && (
        <TableCell className="text-sm">
          <Badge 
            variant="outline" 
            className={status.className}
            key={`${lead.id}-${lead.assignable}-${lead.booked_call}-${lead.venditore}`}
          >
            {status.label}
          </Badge>
        </TableCell>
      )}

      {visibleColumns.includes('stato_del_lead') && (
        <TableCell className="text-sm">
          {lead.stato_del_lead ? (
            <Badge 
              variant="outline" 
              className={
                lead.stato_del_lead.toLowerCase() === 'nuovo' 
                  ? 'bg-green-500/15 text-green-400 border-green-500/30'
                  : lead.stato_del_lead.toLowerCase() === 'vecchio'
                    ? 'bg-destructive/10 text-destructive border-destructive/40'
                    : 'bg-muted text-muted-foreground border-border'
              }
            >
              {lead.stato_del_lead}
            </Badge>
          ) : (
            '-'
          )}
        </TableCell>
      )}
      
      {visibleColumns.includes('venditore') && (
        <TableCell className="text-sm">
          {lead.venditore || '-'}
        </TableCell>
      )}

      {visibleColumns.includes('vendita') && (
        <TableCell className="text-sm">
          {lead.vendita_chiusa ? (
            <Badge variant="outline" className="bg-green-500/15 text-green-400 border-green-500/30">
              <ShoppingCart className="h-3 w-3 mr-1" />
              Venduto
            </Badge>
          ) : (
            '-'
          )}
        </TableCell>
      )}
      
      <TableCell className="w-24">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShowDetails(lead)}
            className="text-blue-500 hover:text-blue-400 hover:bg-primary/10 p-2"
          >
            <Info className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(lead.id!)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 p-2"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default LeadTableRow;
