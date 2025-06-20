
import LeadAssignmentWithExclusions from "@/components/LeadAssignmentWithExclusions";
import { RealTimeStatsSection } from "@/components/RealTimeStatsSection";

const Index = () => {
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
