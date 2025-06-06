
import { useAuth } from "@/hooks/useAuth";
import { useLeadCheck } from "@/hooks/useLeadCheck";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardStats from "@/components/dashboard/DashboardStats";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import LoadingIndicator from "@/components/dashboard/LoadingIndicator";

const Index = () => {
  const { user, profile, isAdmin } = useAuth();
  const { isCheckingLeads, handleManualLeadCheck } = useLeadCheck();

  // Debug user and profile state
  console.log("👤 Auth state:", { user: !!user, profile: !!profile, isAdmin });

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Lead Management System</h1>
          <p className="text-muted-foreground">Gestisci l'assegnazione e il monitoraggio dei tuoi lead</p>
          
          <LoadingIndicator isCheckingLeads={isCheckingLeads} />
        </div>

        <DashboardStats />

        <DashboardTabs 
          isCheckingLeads={isCheckingLeads} 
          handleManualLeadCheck={handleManualLeadCheck} 
        />
      </div>
    </div>
  );
};

export default Index;
