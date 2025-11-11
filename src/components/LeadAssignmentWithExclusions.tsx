
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SourceFilter } from "@/components/lead-assignment/SourceFilter";
import { AssignmentForm } from "@/components/lead-assignment/AssignmentForm";
import { BypassTimeIntervalControl } from "@/components/lead-assignment/BypassTimeIntervalControl";
import { LeadScoreHotFilter } from "@/components/lead-assignment/LeadScoreHotFilter";
import { AvailableLeadsCounter } from "@/components/lead-assignment/AvailableLeadsCounter";
import { useLeadAssignment } from "@/hooks/useLeadAssignment";
import { useLeadSync } from "@/contexts/LeadSyncContext";
import { Loader2, RefreshCcw, CheckCircle, AlertCircle } from "lucide-react";
import { useEffect } from "react";

const LeadAssignmentWithExclusions = () => {
  const { stats, isRefreshing, performVerification, isVerifying } = useLeadSync();
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
    includedSources,
    excludeFromIncluded,
    sourceMode,
    availableLeads,
    uniqueSources,
    bypassTimeInterval,
    onlyHotLeads,
    isUpdatingCount,
    addExcludedSource,
    removeExcludedSource,
    addIncludedSource,
    removeIncludedSource,
    addExcludeFromIncluded,
    removeExcludeFromIncluded,
    toggleSourceMode,
    toggleBypassTimeInterval,
    toggleOnlyHotLeads,
    handleAssign,
    updateAvailableLeads,
    refreshUniqueSources
  } = useLeadAssignment();

  // Refresh del conteggio quando cambiano gli stats globali
  useEffect(() => {
    console.log("📊 Global stats changed, triggering count refresh:", stats.assignable);
    updateAvailableLeads();
  }, [stats.assignable, updateAvailableLeads]);

  const handleManualVerification = async () => {
    try {
      console.log("🔄 Manual verification triggered");
      await performVerification();
      await updateAvailableLeads();
    } catch (error) {
      console.error("❌ Error in manual verification:", error);
    }
  };

  const getVerificationStatusIcon = () => {
    if (isVerifying || isRefreshing) {
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
    
    if (stats.total > 0) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    
    return <AlertCircle className="h-4 w-4 text-orange-600" />;
  };

  const getVerificationStatusText = () => {
    if (isVerifying) {
      return "Verifica assegnabilità in corso...";
    }
    
    if (isRefreshing) {
      return "Aggiornamento dati in corso...";
    }
    
    if (stats.total > 0) {
      const baseText = `Sistema aggiornato - ${stats.total} lead totali, ${stats.assignable} assegnabili`;
      if (bypassTimeInterval) {
        return `${baseText} (Bypass attivo: include lead recenti)`;
      }
      return baseText;
    }
    
    return "In attesa di dati...";
  };

  // Il conteggio corrente dei lead disponibili è gestito dal nuovo hook in tempo reale
  const isCountLoading = isVerifying || isRefreshing || isUpdatingCount;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg sm:text-xl">
              Assegnazione Lead
            </CardTitle>
            {getVerificationStatusIcon()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualVerification}
            disabled={isVerifying || isRefreshing}
            className="flex items-center gap-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors"
          >
            <RefreshCcw className={`h-4 w-4 ${(isVerifying || isRefreshing) ? 'animate-spin' : ''}`} />
            Riverifica
          </Button>
        </div>
        <CardDescription className="text-sm">
          {getVerificationStatusText()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* CONTATORE LEAD DISPONIBILI con aggiornamento in tempo reale */}
        <AvailableLeadsCounter
          availableLeads={availableLeads}
          sourceMode={sourceMode}
          excludedSources={excludedSources}
          includedSources={includedSources}
          excludeFromIncluded={excludeFromIncluded}
          bypassTimeInterval={bypassTimeInterval}
          isLoading={isCountLoading}
        />

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
            isSubmitting={isSubmitting || isVerifying || isRefreshing}
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
          isSubmitting={isSubmitting || isVerifying || isRefreshing}
          availableLeads={availableLeads}
          onAssign={handleAssign}
          showOnlyCampaign={true}
          showButton={false}
        />
        
        {/* Bypass Time Interval Control */}
        <BypassTimeIntervalControl
          bypassTimeInterval={bypassTimeInterval}
          onToggleBypass={toggleBypassTimeInterval}
          disabled={isSubmitting || isVerifying || isRefreshing}
        />

        {/* Lead Score Hot Filter */}
        <LeadScoreHotFilter
          onlyHotLeads={onlyHotLeads}
          onToggleHotLeads={toggleOnlyHotLeads}
          disabled={isSubmitting || isVerifying || isRefreshing}
        />
        
        {/* Source Filter */}
        <SourceFilter 
          uniqueSources={uniqueSources}
          excludedSources={excludedSources}
          includedSources={includedSources}
          excludeFromIncluded={excludeFromIncluded}
          sourceMode={sourceMode}
          onAddExcludedSource={addExcludedSource}
          onRemoveExcludedSource={removeExcludedSource}
          onAddIncludedSource={addIncludedSource}
          onRemoveIncludedSource={removeIncludedSource}
          onAddExcludeFromIncluded={addExcludeFromIncluded}
          onRemoveExcludeFromIncluded={removeExcludeFromIncluded}
          onToggleSourceMode={toggleSourceMode}
          onRefreshSources={refreshUniqueSources}
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
          isSubmitting={isSubmitting || isVerifying || isRefreshing}
          availableLeads={availableLeads}
          onAssign={handleAssign}
          showOnlyButton={true}
        />
      </CardContent>
    </Card>
  );
};

export default LeadAssignmentWithExclusions;
