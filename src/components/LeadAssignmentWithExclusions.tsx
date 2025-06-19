import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SourceFilter } from "@/components/lead-assignment/SourceFilter";
import { AssignmentForm } from "@/components/lead-assignment/AssignmentForm";
import { BypassTimeIntervalControl } from "@/components/lead-assignment/BypassTimeIntervalControl";
import { AvailableLeadsCounter } from "@/components/lead-assignment/AvailableLeadsCounter";
import { useLeadAssignment } from "@/hooks/useLeadAssignment";
import { useAssignabilityVerification } from "@/hooks/useAssignabilityVerification";
import { useLeadSync } from "@/contexts/LeadSyncContext";
import { Loader2, RefreshCcw, CheckCircle, AlertCircle } from "lucide-react";
import { useEffect } from "react";

const LeadAssignmentWithExclusions = () => {
  const { stats, isRefreshing } = useLeadSync();
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
    isUpdatingCount,
    addExcludedSource,
    removeExcludedSource,
    addIncludedSource,
    removeIncludedSource,
    addExcludeFromIncluded,
    removeExcludeFromIncluded,
    toggleSourceMode,
    toggleBypassTimeInterval,
    handleAssign,
    updateAvailableLeads
  } = useLeadAssignment();

  const {
    verification,
    performVerification,
    resetVerification,
    isVerifying
  } = useAssignabilityVerification();

  // Verifica automatica all'avvio e aggiorna dati locali quando cambiano gli stats globali
  useEffect(() => {
    performVerification().then(() => {
      updateAvailableLeads();
    }).catch(console.error);
  }, []);

  // Sincronizza i lead disponibili con gli stats globali
  useEffect(() => {
    console.log("📊 Syncing available leads with global stats:", stats.assignable);
    updateAvailableLeads();
  }, [stats.assignable, updateAvailableLeads]);

  const handleManualVerification = async () => {
    try {
      await performVerification();
      await updateAvailableLeads();
    } catch (error) {
      console.error("❌ Errore nella verifica manuale:", error);
    }
  };

  const getVerificationStatusIcon = () => {
    if (isVerifying || isRefreshing) {
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
    
    switch (verification.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getVerificationStatusText = () => {
    if (isVerifying) {
      return "Verifica assegnabilità in corso...";
    }
    
    if (isRefreshing) {
      return "Aggiornamento dati in corso...";
    }
    
    switch (verification.status) {
      case 'completed':
        const baseText = `Ultima verifica: ${verification.updated} lead aggiornati su ${verification.totalChecked}`;
        if (bypassTimeInterval) {
          return `${baseText} (Bypass attivo: include lead recenti)`;
        }
        return baseText;
      case 'error':
        return "Errore nella verifica - riprova";
      default:
        return "Verifica assegnabilità non eseguita";
    }
  };

  // Usa gli stats dal context globale come fonte primaria, ma considera anche gli aggiornamenti locali
  const currentAvailableLeads = availableLeads || stats.assignable || 0;
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
            className="flex items-center gap-2"
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
        {/* Mostra stato di verifica se in corso */}
        {(isVerifying || isRefreshing) && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <p className="text-blue-800 font-medium">
                  {isVerifying ? "Verifica in corso..." : "Aggiornamento dati..."}
                </p>
                <p className="text-blue-600 text-sm">
                  {isVerifying 
                    ? "Controllo completo del database per garantire assegnazioni corrette"
                    : "Sincronizzazione dei dati in tempo reale"
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CONTATORE LEAD DISPONIBILI con funzione di refresh */}
        <AvailableLeadsCounter
          availableLeads={currentAvailableLeads}
          sourceMode={sourceMode}
          excludedSources={excludedSources}
          includedSources={includedSources}
          excludeFromIncluded={excludeFromIncluded}
          bypassTimeInterval={bypassTimeInterval}
          isLoading={isCountLoading}
          onRefresh={updateAvailableLeads}
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
            availableLeads={currentAvailableLeads}
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
          availableLeads={currentAvailableLeads}
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
          availableLeads={currentAvailableLeads}
          onAssign={handleAssign}
          showOnlyButton={true}
        />
      </CardContent>
    </Card>
  );
};

export default LeadAssignmentWithExclusions;
