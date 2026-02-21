
import LeadAssignmentWithExclusions from "@/components/LeadAssignmentWithExclusions";
import { RealTimeStatsSection } from "@/components/RealTimeStatsSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 pt-14 md:pt-16 pb-20 md:pb-0">
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 space-y-6 md:space-y-8">
        <RealTimeStatsSection />
        
        <LeadAssignmentWithExclusions />
      </div>
    </div>
  );
};

export default Index;
