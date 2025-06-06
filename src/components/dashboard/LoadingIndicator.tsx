
import { Loader2 } from "lucide-react";

interface LoadingIndicatorProps {
  isCheckingLeads: boolean;
}

const LoadingIndicator = ({ isCheckingLeads }: LoadingIndicatorProps) => {
  if (!isCheckingLeads) return null;

  return (
    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Controllo automatico dell'assegnabilità dei lead in corso...</span>
    </div>
  );
};

export default LoadingIndicator;
