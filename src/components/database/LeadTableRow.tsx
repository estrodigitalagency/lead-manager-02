
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Info, MoreVertical, Ban, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
          <Badge variant="outline" className={lead.booked_call === 'SI' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
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
      
      {visibleColumns.includes('venditore') && (
        <TableCell className="text-sm">
          {lead.venditore || '-'}
        </TableCell>
      )}
      
      <TableCell className="w-24">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShowDetails(lead)}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-2"
          >
            <Info className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-gray-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onToggleManuallyNotAssignable(lead.id!, lead.manually_not_assignable || false)}
                className="cursor-pointer"
              >
                {lead.manually_not_assignable ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    Rendi assegnabile
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4 mr-2 text-orange-600" />
                    Rendi non assegnabile
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(lead.id!)}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default LeadTableRow;
