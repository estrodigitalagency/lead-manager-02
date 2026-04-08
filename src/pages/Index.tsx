
import LeadAssignmentWithExclusions from "@/components/LeadAssignmentWithExclusions";
import { RealTimeStatsSection } from "@/components/RealTimeStatsSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pt-16 md:pt-[72px] pb-24 md:pb-8">
      <div className="container mx-auto px-4 md:px-6 py-5 md:py-8 space-y-6 md:space-y-8 max-w-5xl">
        <RealTimeStatsSection />
        <LeadAssignmentWithExclusions />
      </div>
    </div>
  );
};

export default Index;
