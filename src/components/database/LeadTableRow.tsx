
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, Info } from "lucide-react";
import { Lead } from "@/types/lead";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import FonteDisplay from "./FonteDisplay";

interface LeadTableRowProps {
  lead: Lead;
  isSelected: boolean;
  visibleColumns: string[];
  onSelect: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
  onShowDetails: (lead: Lead) => void;
}

const LeadTableRow = ({ lead, isSelected, visibleColumns, onSelect, onDelete, onShowDetails }: LeadTableRowProps) => {
  return (
    <TableRow>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(lead.id!, !!checked)}
          aria-label={`Seleziona lead ${lead.nome}`}
        />
      </TableCell>
      {visibleColumns.includes('data') && (
        <TableCell className="whitespace-nowrap">
          {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: it })}
        </TableCell>
      )}
      {visibleColumns.includes('nome') && (
        <TableCell className="font-medium">{lead.nome}</TableCell>
      )}
      {visibleColumns.includes('cognome') && (
        <TableCell>{lead.cognome || '-'}</TableCell>
      )}
      {visibleColumns.includes('email') && (
        <TableCell className="max-w-[200px] truncate">{lead.email || '-'}</TableCell>
      )}
      {visibleColumns.includes('telefono') && (
        <TableCell>{lead.telefono || '-'}</TableCell>
      )}
      {visibleColumns.includes('fonte') && (
        <TableCell className="max-w-[150px]">
          <FonteDisplay fonte={lead.fonte} />
        </TableCell>
      )}
      {visibleColumns.includes('booked_call') && (
        <TableCell>
          <span className={`px-2 py-1 rounded-full text-xs ${
            lead.booked_call === 'SI' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {lead.booked_call === 'SI' ? 'Sì' : 'No'}
          </span>
        </TableCell>
      )}
      {visibleColumns.includes('stato') && (
        <TableCell>
          <span className={`px-2 py-1 rounded-full text-xs ${
            lead.assignable 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {lead.assignable ? 'Assegnabile' : 'Non assegnabile'}
          </span>
        </TableCell>
      )}
      {visibleColumns.includes('venditore') && (
        <TableCell>
          {lead.venditore || 'Non assegnato'}
        </TableCell>
      )}
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShowDetails(lead)}
            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
          >
            <Info className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(lead.id!)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive-foreground hover:bg-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default LeadTableRow;
