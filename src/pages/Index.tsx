
import { RealTimeStatsSection } from "@/components/RealTimeStatsSection";
import LeadAssignmentWithExclusions from "@/components/LeadAssignmentWithExclusions";
import PersistentNavigation from "@/components/PersistentNavigation";

const Index = () => {
  return (
    <div className="min-h-screen">
      <PersistentNavigation />
      <RealTimeStatsSection />
      
      {/* Tool di Assegnazione Lead */}
      <section className="py-12 sm:py-24 px-4 bg-background/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Assegnazione Lead</span>
            </h2>
            <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Assegna i lead ai tuoi venditori in modo intelligente e rapido
            </p>
          </div>
          
          <div className="glass-card p-4 sm:p-8">
            <LeadAssignmentWithExclusions />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
