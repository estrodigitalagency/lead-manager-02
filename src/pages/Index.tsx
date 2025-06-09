
import { useEffect } from "react";
import PersistentNavigation from "@/components/PersistentNavigation";
import { HeroSection } from "@/components/HeroSection";
import { RealTimeStatsSection } from "@/components/RealTimeStatsSection";
import LeadAssignmentWithExclusions from "@/components/LeadAssignmentWithExclusions";

const Index = () => {
  useEffect(() => {
    // Ensure proper mobile scroll behavior
    document.body.classList.add('mobile-scroll-fix');
    
    return () => {
      document.body.classList.remove('mobile-scroll-fix');
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PersistentNavigation />
      
      <div className="pt-20 pb-8 px-4">
        <div className="container mx-auto space-y-8">
          <HeroSection />
          <RealTimeStatsSection />
          <div className="max-w-4xl mx-auto">
            <LeadAssignmentWithExclusions />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
