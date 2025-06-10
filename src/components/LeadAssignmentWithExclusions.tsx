
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExcludedSources } from "@/components/lead-assignment/ExcludedSources";
import { AssignmentForm } from "@/components/lead-assignment/AssignmentForm";
import { useLeadAssignment } from "@/hooks/useLeadAssignment";
import { assignLeadsWithExclusions } from "@/services/leadAssignmentService";

const LeadAssignmentWithExclusions = () => {
  const {
    numLead,
    setNumLead,
    venditore,
    setVenditore,
    campagna,
    setCampagna,
    salespeople,
    campagne,
    isSubmitting,
    excludedSources,
    availableLeads,
    uniqueSources,
    addExcludedSource,
    removeExcludedSource,
    handleAssign
  } = useLeadAssignment();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Assegnazione Lead</CardTitle>
        <CardDescription className="text-sm">
          Assegna lead ai venditori escludendo fonti specifiche. Lead disponibili: {availableLeads}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <AssignmentForm
          numLead={numLead}
          setNumLead={setNumLead}
          venditore={venditore}
          setVenditore={setVenditore}
          campagna={campagna}
          setCampagna={setCampagna}
          salespeople={salespeople}
          campagne={campagne}
          isSubmitting={isSubmitting}
          availableLeads={availableLeads}
          onAssign={handleAssign}
        />
        
        <ExcludedSources 
          uniqueSources={uniqueSources}
          excludedSources={excludedSources}
          onAddExcludedSource={addExcludedSource}
          onRemoveExcludedSource={removeExcludedSource}
        />
      </CardContent>
    </Card>
  );
};

export default LeadAssignmentWithExclusions;
