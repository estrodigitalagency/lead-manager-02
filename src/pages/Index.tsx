
import { RealTimeStatsSection } from "@/components/RealTimeStatsSection";
import LeadAssignmentForm from "@/components/LeadAssignmentForm";
import PersistentNavigation from "@/components/PersistentNavigation";

const Index = () => {
  return (
    <div className="min-h-screen">
      <PersistentNavigation />
      <RealTimeStatsSection />
      
      {/* Tool di Assegnazione Lead */}
      <section className="py-24 px-4 bg-background/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Assegnazione Lead</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Assegna i lead ai tuoi venditori in modo intelligente e rapido
            </p>
          </div>
          
          <div className="glass-card p-8">
            <LeadAssignmentForm onAssignmentSuccess={() => {}} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
