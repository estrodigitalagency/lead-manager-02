
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { navItems, standaloneRoutes, publicRoutes } from "./nav-items";
import { LeadSyncProvider } from "@/contexts/LeadSyncContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import PersistentNavigation from "@/components/PersistentNavigation";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  // Check if current route is public or standalone (both should be unprotected)
  const isPublicRoute = publicRoutes.some(route => route.to === location.pathname);
  const isStandaloneRoute = standaloneRoutes.some(route => route.to === location.pathname);
  
  console.log("🔐 ProtectedRoute Debug:", {
    pathname: location.pathname,
    isAuthenticated,
    loading,
    isPublicRoute,
    isStandaloneRoute
  });
  
  if (!isAuthenticated && !isPublicRoute && !isStandaloneRoute && !loading) {
    console.log("🚫 Redirecting to login...");
    // Redirect to login if not authenticated and not on public/standalone route
    window.location.href = '/login';
    return null;
  }
  
  console.log("✅ Allowing route access");
  return <>{children}</>;
};

const AppContent = () => {
  const location = useLocation();
  const isStandalonePage = standaloneRoutes.some(route => route.to === location.pathname);
  const isPublicPage = publicRoutes.some(route => route.to === location.pathname);

  return (
    <ProtectedRoute>
      {!isStandalonePage && !isPublicPage && <PersistentNavigation />}
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
    </ProtectedRoute>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LeadSyncProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </LeadSyncProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
