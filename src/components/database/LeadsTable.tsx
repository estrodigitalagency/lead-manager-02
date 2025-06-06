import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Loader2 } from "lucide-react";
import { Lead } from "@/types/lead";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileLeadsTable from "./MobileLeadsTable";

interface LeadsTableProps {
  leads: Lead[];
  isLoading: boolean;
  selectedItems: string[];
  onSelectionChange: (selected: string[]) => void;
  onDelete: (id: string) => void;
}

const LeadsTable = ({ 
  leads, 
  isLoading, 
  selectedItems, 
  onSelectionChange, 
  onDelete 
}: LeadsTableProps) => {
  const isMobile = useIsMobile();

  const handleItemSelect = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedItems, id]);
    } else {
      onSelectionChange(selectedItems.filter(item => item !== id));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
        <span>Caricamento lead...</span>
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileLeadsTable
        leads={leads}
        selectedItems={selectedItems}
        onSelectionChange={onSelectionChange}
        onDelete={onDelete}
      />
    );
  }

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

  if (leads.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Nessun lead trovato.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={selectedItems.length === leads.length && leads.length > 0}
              onCheckedChange={(checked) => {
                if (checked) {
                  onSelectionChange(leads.map(lead => lead.id!));
                } else {
                  onSelectionChange([]);
                }
              }}
            />
          </TableHead>
          <TableHead className="table-header-cell">Data</TableHead>
          <TableHead className="table-header-cell">Nome</TableHead>
          <TableHead className="table-header-cell">Cognome</TableHead>
          <TableHead className="table-header-cell">Email</TableHead>
          <TableHead className="table-header-cell">Telefono</TableHead>
          <TableHead className="table-header-cell">Fonte</TableHead>
          <TableHead className="table-header-cell">Call Prenotate</TableHead>
          <TableHead className="table-header-cell">Stato</TableHead>
          <TableHead className="table-header-cell">Venditore</TableHead>
          <TableHead className="table-header-cell">Note</TableHead>
          <TableHead className="table-header-cell w-20">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors">
            <TableCell>
              <Checkbox
                checked={selectedItems.includes(lead.id!)}
                onCheckedChange={(checked) => handleItemSelect(lead.id!, !!checked)}
              />
            </TableCell>
            <TableCell className="table-body-cell">{formatDate(lead.created_at)}</TableCell>
            <TableCell className="table-body-cell">{lead.nome}</TableCell>
            <TableCell className="table-body-cell">{lead.cognome || '-'}</TableCell>
            <TableCell className="table-body-cell">{lead.email}</TableCell>
            <TableCell className="table-body-cell">{lead.telefono}</TableCell>
            <TableCell className="table-body-cell">{formatFonte(lead.fonte)}</TableCell>
            <TableCell className="table-body-cell">
              <Badge variant="outline" className={lead.booked_call === "SI" ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}>
                {lead.booked_call || "NO"}
              </Badge>
            </TableCell>
            <TableCell className="table-body-cell">
              {getStatusBadge(lead)}
            </TableCell>
            <TableCell className="table-body-cell">{lead.venditore || '-'}</TableCell>
            <TableCell className="table-body-cell">{lead.note || '-'}</TableCell>
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
        ))}
      </TableBody>
    </Table>
  );
};

export default LeadsTable;
