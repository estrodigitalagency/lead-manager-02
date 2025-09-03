
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { navItems, standaloneRoutes } from "./nav-items";
import { LeadSyncProvider } from "@/contexts/LeadSyncContext";
import PersistentNavigation from "@/components/PersistentNavigation";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isStandalonePage = standaloneRoutes.some(route => route.to === location.pathname);

  return (
    <>
      {!isStandalonePage && <PersistentNavigation />}
      <Routes>
        {navItems.map(({ to, page }) => (
          <Route key={to} path={to} element={page} />
        ))}
        {standaloneRoutes.map(({ to, page }) => (
          <Route key={to} path={to} element={page} />
        ))}
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LeadSyncProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </LeadSyncProvider>
  </QueryClientProvider>
);

export default App;
