
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Database, BarChart3, Settings as SettingsIcon } from "lucide-react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import DatabasePage from "./pages/Database";
import ReportsPage from "./pages/Reports";

const queryClient = new QueryClient();

const Navigation = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  
  if (isHome) return null;
  
  return (
    <div className="bg-white border-b border-border/30 px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="icon" className="border">
              <ArrowLeft className="h-4 w-4 text-primary" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/database">
              <Button variant={location.pathname === '/database' ? 'default' : 'outline'} className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database
              </Button>
            </Link>
            <Link to="/reports">
              <Button variant={location.pathname === '/reports' ? 'default' : 'outline'} className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Report
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant={location.pathname === '/settings' ? 'default' : 'outline'} className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                Impostazioni
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navigation />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/database" element={<DatabasePage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
