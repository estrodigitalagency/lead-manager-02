
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PersistentNavigation from "@/components/PersistentNavigation";
import { HeroSection } from "@/components/HeroSection";
import { StatsSection } from "@/components/StatsSection";
import LeadAssignmentVerificationWrapper from "@/components/LeadAssignmentVerificationWrapper";
import AssignmentHistory from "@/components/AssignmentHistory";
import { RealTimeStatsSection } from "@/components/RealTimeStatsSection";
import { getLeadsStats } from "@/services/databaseService";

const Index = () => {
  const [stats, setStats] = useState({
    total: 0,
    assignable: 0,
    assigned: 0,
    booked: 0
  });

  const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['leadsStats'],
    queryFn: getLeadsStats,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  useEffect(() => {
    if (statsData) {
      setStats(statsData);
    }
  }, [statsData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <HeroSection />
        
        <StatsSection />
        
        <RealTimeStatsSection />
        
        <LeadAssignmentVerificationWrapper />
        
        <AssignmentHistory />
      </div>
    </div>
  );
};

export default Index;
