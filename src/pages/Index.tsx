
import LeadAssignmentWithExclusions from "@/components/LeadAssignmentWithExclusions";
import { RealTimeStatsSection } from "@/components/RealTimeStatsSection";
import { useLeadSync } from "@/contexts/LeadSyncContext";
import { setGlobalRefreshCallback } from "@/services/leadAssignabilityService";
import { useEffect } from "react";

const Index = () => {
  const { refreshAllData } = useLeadSync();

  // Registra il callback globale per il refresh
  useEffect(() => {
    setGlobalRefreshCallback(refreshAllData);
    
    return () => {
      setGlobalRefreshCallback(null);
    };
  }, [refreshAllData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 pt-16">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <RealTimeStatsSection />
        
        <LeadAssignmentWithExclusions />
      </div>
    </div>
  );
};

export default Index;
