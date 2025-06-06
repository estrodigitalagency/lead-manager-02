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
import { LeadLavorato } from "@/types/leadLavorato";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileLavoratiTable from "./MobileLavoratiTable";

interface LeadLavoratiTableProps {
  leadLavorati: LeadLavorato[];
  isLoading: boolean;
  selectedItems: string[];
  onSelectionChange: (selected: string[]) => void;
  onDelete: (id: string) => void;
}

const LeadLavoratiTable = ({ 
  leadLavorati, 
  isLoading, 
  selectedItems, 
  onSelectionChange, 
  onDelete 
}: LeadLavoratiTableProps) => {
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
        <span>Caricamento lead lavorati...</span>
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileLavoratiTable
        leadLavorati={leadLavorati}
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

  const getEsitoBadge = (esito: string | null) => {
    if (!esito) return <span>-</span>;
    
    const esitoLower = esito.toLowerCase();
    let className = "";
    
    if (esitoLower.includes('vendita') || esitoLower.includes('chiuso')) {
      className = "bg-green-100 text-green-800 border-green-200";
    } else if (esitoLower.includes('interessato') || esitoLower.includes('ricontattare')) {
      className = "bg-yellow-100 text-yellow-800 border-yellow-200";
    } else if (esitoLower.includes('non interessato') || esitoLower.includes('rifiutato')) {
      className = "bg-red-100 text-red-800 border-red-200";
    } else {
      className = "bg-gray-100 text-gray-800 border-gray-200";
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={selectedItems.length === leadLavorati.length && leadLavorati.length > 0}
              onCheckedChange={(checked) => {
                if (checked) {
                  onSelectionChange(leadLavorati.map(lead => lead.id!));
                } else {
                  onSelectionChange([]);
                }
              }}
            />
          </TableHead>
          <TableHead className="table-header-cell">Data Contatto</TableHead>
          <TableHead className="table-header-cell">Data Call</TableHead>
          <TableHead className="table-header-cell">Nome</TableHead>
          <TableHead className="table-header-cell">Cognome</TableHead>
          <TableHead className="table-header-cell">Email</TableHead>
          <TableHead className="table-header-cell">Telefono</TableHead>
          <TableHead className="table-header-cell">Venditore</TableHead>
          <TableHead className="table-header-cell">Esito</TableHead>
          <TableHead className="table-header-cell">Obiezioni</TableHead>
          <TableHead className="table-header-cell w-20">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leadLavorati.map((lead) => (
          <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors">
            <TableCell>
              <Checkbox
                checked={selectedItems.includes(lead.id!)}
                onCheckedChange={(checked) => handleItemSelect(lead.id!, !!checked)}
              />
            </TableCell>
            <TableCell className="table-body-cell">
              {lead.data_contatto ? formatDate(lead.data_contatto) : '-'}
            </TableCell>
            <TableCell className="table-body-cell">
              {lead.data_call ? formatDate(lead.data_call) : '-'}
            </TableCell>
            <TableCell className="table-body-cell">{lead.nome}</TableCell>
            <TableCell className="table-body-cell">{lead.cognome || '-'}</TableCell>
            <TableCell className="table-body-cell">{lead.email || '-'}</TableCell>
            <TableCell className="table-body-cell">{lead.telefono || '-'}</TableCell>
            <TableCell className="table-body-cell">{lead.venditore || '-'}</TableCell>
            <TableCell className="table-body-cell">{getEsitoBadge(lead.esito)}</TableCell>
            <TableCell className="table-body-cell">{lead.obiezioni || '-'}</TableCell>
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

export default LeadLavoratiTable;
