import React from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { navItems, standaloneRoutes, publicRoutes } from "./nav-items";
import { LeadSyncProvider } from "@/contexts/LeadSyncContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MarketProvider } from "@/contexts/MarketContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import PersistentNavigation from "@/components/PersistentNavigation";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  const isPublicRoute = publicRoutes.some(route => route.to === location.pathname) || location.pathname.startsWith('/wa/') || location.pathname === '/wa' || location.pathname === '/ranking';
  const isStandaloneRoute = standaloneRoutes.some(route => route.to === location.pathname);
  const isLeadAssignmentPage = location.pathname === '/lead-assignment';
  
  console.log("🔐 ProtectedRoute Debug:", {
    pathname: location.pathname,
    isAuthenticated,
    loading,
    isPublicRoute,
    isStandaloneRoute,
    isLeadAssignmentPage
  });
  
  if (!isAuthenticated && !isPublicRoute && !isStandaloneRoute && !isLeadAssignmentPage && !loading) {
    console.log("🚫 Redirecting to login...");
    window.location.href = '/login';
    return null;
  }
  
  console.log("✅ Allowing route access");
  return <>{children}</>;
};

const AppContent = () => {
  const location = useLocation();
  const isStandalonePage = standaloneRoutes.some(route => route.to === location.pathname);
  const isPublicPage = publicRoutes.some(route => route.to === location.pathname) || location.pathname.startsWith('/wa/') || location.pathname === '/wa' || location.pathname === '/ranking';

  return (
    <ProtectedRoute>
      {!isStandalonePage && !isPublicPage && <PersistentNavigation />}
      {/* Mentre il pezzo della pagina arriva si mostra un'attesa, invece del vuoto. */}
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }>
      <Routes>
        {navItems.map(({ to, page }) => (
          <Route key={to} path={to} element={page} />
        ))}
        {standaloneRoutes.map(({ to, page }) => (
          <Route key={to} path={to} element={page} />
        ))}
        {publicRoutes.map(({ to, page }) => (
          <Route key={to} path={to} element={page} />
        ))}
      </Routes>
      </Suspense>
    </ProtectedRoute>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <MarketProvider>
        <LanguageProvider>
          <LeadSyncProvider>
            <TooltipProvider>
              <Toaster />
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </TooltipProvider>
          </LeadSyncProvider>
        </LanguageProvider>
      </MarketProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
