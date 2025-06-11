
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExcludedSources } from "@/components/lead-assignment/ExcludedSources";
import { AssignmentForm } from "@/components/lead-assignment/AssignmentForm";
import { useLeadAssignment } from "@/hooks/useLeadAssignment";
import { Loader2 } from "lucide-react";

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
    isCheckingAssignability,
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
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
          Assegnazione Lead
          {isCheckingAssignability && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
        </CardTitle>
        <CardDescription className="text-sm">
          {isCheckingAssignability ? (
            "Verifica assegnabilità in corso..."
          ) : (
            `Assegna lead ai venditori escludendo fonti specifiche. Lead disponibili: ${availableLeads}`
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Number of leads and Salesperson selection */}
          <AssignmentForm
            numLead={numLead}
            setNumLead={setNumLead}
            venditore={venditore}
            setVenditore={setVenditore}
            campagna={campagna}
            setCampagna={setCampagna}
            salespeople={salespeople}
            campagne={campagne}
            isSubmitting={isSubmitting || isCheckingAssignability}
            availableLeads={availableLeads}
            onAssign={handleAssign}
            showButton={false}
          />
        </div>

        {/* Campaign field */}
        <AssignmentForm
          numLead={numLead}
          setNumLead={setNumLead}
          venditore={venditore}
          setVenditore={setVenditore}
          campagna={campagna}
          setCampagna={setCampagna}
          salespeople={salespeople}
          campagne={campagne}
          isSubmitting={isSubmitting || isCheckingAssignability}
          availableLeads={availableLeads}
          onAssign={handleAssign}
          showOnlyCampaign={true}
          showButton={false}
        />
        
        {/* Excluded Sources - positioned before the button */}
        <ExcludedSources 
          uniqueSources={uniqueSources}
          excludedSources={excludedSources}
          onAddExcludedSource={addExcludedSource}
          onRemoveExcludedSource={removeExcludedSource}
        />

        {/* Assignment Button - at the bottom */}
        <AssignmentForm
          numLead={numLead}
          setNumLead={setNumLead}
          venditore={venditore}
          setVenditore={setVenditore}
          campagna={campagna}
          setCampagna={setCampagna}
          salespeople={salespeople}
          campagne={campagne}
          isSubmitting={isSubmitting || isCheckingAssignability}
          availableLeads={availableLeads}
          onAssign={handleAssign}
          showOnlyButton={true}
        />
      </CardContent>
    </Card>
  );
};

export default LeadAssignmentWithExclusions;
