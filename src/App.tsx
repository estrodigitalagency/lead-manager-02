
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { navItems, standaloneRoutes } from "./nav-items";
import { LeadSyncProvider } from "@/contexts/LeadSyncContext";
import PersistentNavigation from "@/components/PersistentNavigation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LeadSyncProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <PersistentNavigation />
          <Routes>
            {navItems.map(({ to, page }) => (
              <Route key={to} path={to} element={page} />
            ))}
            {standaloneRoutes.map(({ to, page }) => (
              <Route key={to} path={to} element={page} />
            ))}
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LeadSyncProvider>
  </QueryClientProvider>
);

export default App;
