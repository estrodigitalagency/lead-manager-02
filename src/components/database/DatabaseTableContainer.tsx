
import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, UploadCloud } from "lucide-react";
import DatabaseFilters from "@/components/DatabaseFilters";

interface DatabaseTableContainerProps {
  title: string;
  description: string;
  tableName: 'lead_generation' | 'booked_call' | 'lead_lavorati';
  onApplyFilters: (filters: Record<string, any>) => void;
  onAddRecord: () => void;
  onImport: () => void;
  children: ReactNode;
}

const DatabaseTableContainer = ({
  title,
  description,
  tableName,
  onApplyFilters,
  onAddRecord,
  onImport,
  children
}: DatabaseTableContainerProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <DatabaseFilters 
              onApplyFilters={onApplyFilters} 
              tableName={tableName}
            />
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1"
              onClick={onAddRecord}
            >
              <Plus className="h-4 w-4" />
              <span>Aggiungi Record</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1"
              onClick={onImport}
            >
              <UploadCloud className="h-4 w-4" />
              <span>Importa CSV</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};

export default DatabaseTableContainer;
