
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { Lead } from "@/types/lead";

interface LeadTableRowProps {
  lead: Lead;
  isSelected: boolean;
  visibleColumns: string[];
  onSelect: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
}

const LeadTableRow = ({ 
  lead, 
  isSelected, 
  visibleColumns, 
  onSelect, 
  onDelete 
}: LeadTableRowProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFonte = (fonte: string | null) => {
    if (!fonte) return '-';
    const fonti = fonte.split(',').map(f => f.trim()).filter(f => f);
    if (fonti.length === 0) return '-';
    
    return (
      <div className="flex flex-wrap gap-1">
        {fonti.map((f, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            {f}
          </Badge>
        ))}
      </div>
    );
  };

  const getStatusBadge = (lead: Lead) => {
    if (lead.venditore) {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
          Assegnato
        </Badge>
      );
    } else if (lead.assignable) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
          Assegnabile
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          Non assegnabile
        </Badge>
      );
    }
  };

  const isColumnVisible = (key: string) => visibleColumns.includes(key);

  return (
    <TableRow className="hover:bg-muted/30 transition-colors">
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(lead.id!, !!checked)}
        />
      </TableCell>
      {isColumnVisible('data') && (
        <TableCell className="table-body-cell">{formatDate(lead.created_at)}</TableCell>
      )}
      {isColumnVisible('nome') && (
        <TableCell className="table-body-cell">{lead.nome}</TableCell>
      )}
      {isColumnVisible('cognome') && (
        <TableCell className="table-body-cell">{lead.cognome || '-'}</TableCell>
      )}
      {isColumnVisible('email') && (
        <TableCell className="table-body-cell">{lead.email}</TableCell>
      )}
      {isColumnVisible('telefono') && (
        <TableCell className="table-body-cell">{lead.telefono}</TableCell>
      )}
      {isColumnVisible('fonte') && (
        <TableCell className="table-body-cell">{formatFonte(lead.fonte)}</TableCell>
      )}
      {isColumnVisible('booked_call') && (
        <TableCell className="table-body-cell">
          <Badge variant="outline" className={lead.booked_call === "SI" ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}>
            {lead.booked_call || "NO"}
          </Badge>
        </TableCell>
      )}
      {isColumnVisible('stato') && (
        <TableCell className="table-body-cell">
          {getStatusBadge(lead)}
        </TableCell>
      )}
      {isColumnVisible('venditore') && (
        <TableCell className="table-body-cell">{lead.venditore || '-'}</TableCell>
      )}
      {isColumnVisible('note') && (
        <TableCell className="table-body-cell">{lead.note || '-'}</TableCell>
      )}
      <TableCell className="table-body-cell">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(lead.id!)}
          className="text-red-600 hover:text-red-800 hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default LeadTableRow;
