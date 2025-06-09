
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings } from "lucide-react";
import { ColumnConfig } from "@/hooks/useColumnVisibility";

interface ColumnVisibilityControlsProps {
  columns: ColumnConfig[];
  onToggleColumn: (key: string) => void;
}

const ColumnVisibilityControls = ({ columns, onToggleColumn }: ColumnVisibilityControlsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Colonne
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {columns.map((column) => (
          <DropdownMenuItem key={column.key} className="flex items-center space-x-2">
            <Checkbox
              checked={column.visible}
              onCheckedChange={() => onToggleColumn(column.key)}
            />
            <span>{column.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColumnVisibilityControls;
