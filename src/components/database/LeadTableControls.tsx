
import ColumnVisibilityControls from "./ColumnVisibilityControls";
import { ColumnConfig } from "@/hooks/useColumnVisibility";

interface LeadTableControlsProps {
  totalItems: number;
  columns: ColumnConfig[];
  onToggleColumn: (key: string) => void;
}

const LeadTableControls = ({ totalItems, columns, onToggleColumn }: LeadTableControlsProps) => {
  return (
    <div className="flex justify-between items-center">
      <div className="text-sm text-muted-foreground">
        Totale: {totalItems} lead
      </div>
      <ColumnVisibilityControls
        columns={columns}
        onToggleColumn={onToggleColumn}
      />
    </div>
  );
};

export default LeadTableControls;
