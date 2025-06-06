
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LoadingIndicatorProps {
  isCheckingLeads: boolean;
}

const LoadingIndicator = ({ isCheckingLeads }: LoadingIndicatorProps) => {
  if (!isCheckingLeads) return null;

  return (
    <Alert className="mt-4 border-blue-200 bg-blue-50">
      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      <AlertDescription className="ml-2 text-blue-800">
        Controllo automatico dell'assegnabilità dei lead in corso...
      </AlertDescription>
    </Alert>
  );
};

export default LoadingIndicator;
