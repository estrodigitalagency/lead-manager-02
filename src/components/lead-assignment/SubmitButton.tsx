
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  isLoading: boolean;
  isDisabled: boolean;
  text?: string;
  loadingText?: string;
  className?: string;
}

const SubmitButton = ({ 
  isLoading, 
  isDisabled, 
  text = "Assegna", 
  loadingText = "Assegnazione in corso...",
  className = "w-full"
}: SubmitButtonProps) => {
  return (
    <Button 
      type="submit" 
      className={className} 
      disabled={isLoading || isDisabled}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        text
      )}
    </Button>
  );
};

export default SubmitButton;
