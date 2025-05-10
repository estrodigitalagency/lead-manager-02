
import { Lead } from "@/types/lead";

interface AssignmentFormHeaderProps {
  availableLeads: Lead[];
}

const AssignmentFormHeader = ({ availableLeads }: AssignmentFormHeaderProps) => {
  return (
    <div className="bg-muted/50 p-4 rounded-md mb-4">
      <h3 className="text-sm font-medium mb-2">Lead disponibili: {availableLeads.length}</h3>
      <p className="text-xs text-muted-foreground">
        {availableLeads.length === 0 
          ? "Non ci sono lead disponibili da assegnare." 
          : "Questi lead non sono ancora stati assegnati a nessun venditore."}
      </p>
    </div>
  );
};

export default AssignmentFormHeader;
