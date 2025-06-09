
import { TableHead } from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { SortConfig } from "@/hooks/useTableSorting";

interface SortableTableHeadProps {
  children: React.ReactNode;
  sortKey: string;
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
  className?: string;
}

const SortableTableHead = ({ 
  children, 
  sortKey, 
  sortConfig, 
  onSort, 
  className 
}: SortableTableHeadProps) => {
  const getSortIcon = () => {
    if (!sortConfig || sortConfig.key !== sortKey) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="h-4 w-4" />;
    }
    if (sortConfig.direction === 'desc') {
      return <ArrowDown className="h-4 w-4" />;
    }
    return <ArrowUpDown className="h-4 w-4" />;
  };

  return (
    <TableHead className={className}>
      <button
        className="flex items-center gap-2 hover:text-foreground transition-colors"
        onClick={() => onSort(sortKey)}
      >
        {children}
        {getSortIcon()}
      </button>
    </TableHead>
  );
};

export default SortableTableHead;
