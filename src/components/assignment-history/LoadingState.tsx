
import { Loader2 } from "lucide-react";

const LoadingState = () => (
  <div className="flex justify-center items-center h-40">
    <Loader2 className="h-6 w-6 animate-spin mr-2" />
    <span>Caricamento cronologia...</span>
  </div>
);

export default LoadingState;
