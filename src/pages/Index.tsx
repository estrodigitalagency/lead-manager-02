
import { HeroSection } from "@/components/HeroSection";
import { StatsSection } from "@/components/StatsSection";
import { PersistentNavigation } from "@/components/PersistentNavigation";

const Index = () => {
  return (
    <div className="min-h-screen">
      <PersistentNavigation />
      <HeroSection />
      <StatsSection />
    </div>
  );
};

export default Index;
