
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SourceFilter } from "@/components/lead-assignment/SourceFilter";
import { BypassTimeIntervalControl } from "@/components/lead-assignment/BypassTimeIntervalControl";
import { LeadScoreHotFilter } from "@/components/lead-assignment/LeadScoreHotFilter";
import { AvailableLeadsCounter } from "@/components/lead-assignment/AvailableLeadsCounter";
import { AlreadyAssignedLeadsDialog } from "@/components/lead-assignment/AlreadyAssignedLeadsDialog";
import { useLeadAssignment } from "@/hooks/useLeadAssignment";
import { useLeadSync } from "@/contexts/LeadSyncContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2, RefreshCcw, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Send } from "lucide-react";
import { useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

const LeadAssignmentWithExclusions = () => {
  const isMobile = useIsMobile();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { stats, isRefreshing, performVerification, isVerifying } = useLeadSync();
  const {
    numLead, setNumLead, venditore, setVenditore, campagna, setCampagna,
    salespeople, campagne, isSubmitting, excludedSources, includedSources,
    excludeFromIncluded, sourceMode, availableLeads, uniqueSources,
    bypassTimeInterval, onlyHotLeads, isUpdatingCount,
    addExcludedSource, removeExcludedSource, addIncludedSource,
    removeIncludedSource, addExcludeFromIncluded, removeExcludeFromIncluded,
    toggleSourceMode, toggleBypassTimeInterval, toggleOnlyHotLeads,
    handleAssign, updateAvailableLeads, refreshUniqueSources,
    showAlreadyAssignedDialog, alreadyAssignedLeads,
    handleConfirmAssignments, handleCloseAlreadyAssignedDialog
  } = useLeadAssignment();

  useEffect(() => {
    updateAvailableLeads();
  }, [stats.assignable, updateAvailableLeads]);

  const handleManualVerification = async () => {
    try {
      await performVerification();
      await updateAvailableLeads();
    } catch (error) {
      console.error("Error in manual verification:", error);
    }
  };

  const getVerificationStatusIcon = () => {
    if (isVerifying || isRefreshing) {
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
    if (stats.total > 0) {
      return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-amber-500" />;
  };

  const getVerificationStatusText = () => {
    if (isVerifying) return "Verifica assegnabilit\u00e0 in corso...";
    if (isRefreshing) return "Aggiornamento dati in corso...";
    if (stats.total > 0) {
      const baseText = `${stats.total} lead totali, ${stats.assignable} assegnabili`;
      return bypassTimeInterval ? `${baseText} (bypass attivo)` : baseText;
    }
    return "In attesa di dati...";
  };

  const isCountLoading = isVerifying || isRefreshing || isUpdatingCount;
  const isFormDisabled = isSubmitting || isVerifying || isRefreshing;
  const canAssign = venditore && numLead && parseInt(numLead) > 0 && parseInt(numLead) <= availableLeads;

  const getAssignButtonLabel = () => {
    if (isSubmitting) return "Assegnazione in corso...";
    if (!venditore) return "Seleziona un venditore";
    if (!numLead || parseInt(numLead) <= 0) return "Inserisci numero lead";
    if (parseInt(numLead) > availableLeads) return `Max ${availableLeads} lead disponibili`;
    return `Assegna ${numLead} lead`;
  };

  const activeFilterCount = (excludedSources.length || 0) + (includedSources.length || 0) + (bypassTimeInterval ? 1 : 0) + (onlyHotLeads ? 1 : 0);
  const hasAdvancedFilters = activeFilterCount > 0;

  return (
    <Card className="animate-slide-up">
      <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/8">
              <Send className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Assegnazione Lead</CardTitle>
            </div>
            {getVerificationStatusIcon()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualVerification}
            disabled={isVerifying || isRefreshing}
            className="flex items-center gap-1.5 text-xs flex-shrink-0"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${(isVerifying || isRefreshing) ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Riverifica</span>
          </Button>
        </div>
        <CardDescription className="text-xs sm:text-sm mt-1">
          {getVerificationStatusText()}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-5 px-4 sm:px-6">
        {/* Lead counter */}
        <AvailableLeadsCounter
          availableLeads={availableLeads}
          sourceMode={sourceMode}
          excludedSources={excludedSources}
          includedSources={includedSources}
          excludeFromIncluded={excludeFromIncluded}
          bypassTimeInterval={bypassTimeInterval}
          isLoading={isCountLoading}
        />

        {/* --- UNIFIED FORM --- */}
        <div className="space-y-3.5">
          {/* Row 1: Num Lead + Venditore */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-2">
              <Label htmlFor="numLead" className="text-sm font-medium text-foreground">Numero di Lead</Label>
              <Input
                id="numLead"
                type="number"
                inputMode="numeric"
                min="1"
                max={availableLeads}
                value={numLead}
                onChange={(e) => setNumLead(e.target.value)}
                placeholder={`Max ${availableLeads}`}
                disabled={isFormDisabled}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venditore" className="text-sm font-medium text-foreground">Venditore</Label>
              <Select value={venditore} onValueChange={setVenditore} disabled={isFormDisabled}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona venditore" />
                </SelectTrigger>
                <SelectContent className={isMobile ? 'max-h-[200px]' : ''} position="popper">
                  {salespeople.map((person) => {
                    const fullName = `${person.nome} ${person.cognome}`;
                    return (
                      <SelectItem key={person.id} value={fullName}>
                        <span className="truncate">{fullName}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Campagna */}
          <div className="space-y-2">
            <Label htmlFor="campagna" className="text-sm font-medium text-foreground">
              Campagna <span className="text-muted-foreground font-normal text-xs">(opzionale)</span>
            </Label>
            <Select value={campagna} onValueChange={setCampagna} disabled={isFormDisabled}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona una campagna" />
              </SelectTrigger>
              <SelectContent className={isMobile ? 'max-h-[200px]' : ''} position="popper">
                {campagne.map((camp) => (
                  <SelectItem key={camp.id} value={camp.nome}>
                    <span className="truncate">{camp.nome}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* --- ADVANCED FILTERS (collapsible) --- */}
        <div className="rounded-2xl bg-muted/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-2.5">
              Filtri Avanzati
              {hasAdvancedFilters && (
                <Badge variant="default" className="text-[10px] px-2 py-0 h-5">
                  {activeFilterCount}
                </Badge>
              )}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {showAdvanced && (
            <div className="px-4 pb-4 space-y-3 sm:space-y-4 border-t border-border/40">
              <div className="pt-3">
                <BypassTimeIntervalControl
                  bypassTimeInterval={bypassTimeInterval}
                  onToggleBypass={toggleBypassTimeInterval}
                  disabled={isFormDisabled}
                />
              </div>

              <LeadScoreHotFilter
                onlyHotLeads={onlyHotLeads}
                onToggleHotLeads={toggleOnlyHotLeads}
                disabled={isFormDisabled}
              />

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
            </div>
          )}
        </div>

        {/* --- ASSIGN BUTTON --- */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  onClick={handleAssign}
                  disabled={isFormDisabled || !canAssign}
                  className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-2xl"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Assegnazione in corso...
                    </>
                  ) : (
                    getAssignButtonLabel()
                  )}
                </Button>
              </div>
            </TooltipTrigger>
            {!canAssign && !isFormDisabled && (
              <TooltipContent>
                <p className="text-sm">
                  {!venditore ? "Seleziona un venditore per procedere" :
                   !numLead || parseInt(numLead) <= 0 ? "Inserisci il numero di lead da assegnare" :
                   `Sono disponibili solo ${availableLeads} lead`}
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </CardContent>

      <AlreadyAssignedLeadsDialog
        open={showAlreadyAssignedDialog}
        onOpenChange={handleCloseAlreadyAssignedDialog}
        alreadyAssignedLeads={alreadyAssignedLeads}
        targetVenditore={venditore}
        onConfirmAssignments={handleConfirmAssignments}
        isProcessing={isSubmitting}
      />
    </Card>
  );
};

export default LeadAssignmentWithExclusions;
