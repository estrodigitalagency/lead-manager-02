
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Database, BarChart3, Settings, History, LogOut } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import MarketSelector from "@/components/MarketSelector";
import LanguageSelector from "@/components/LanguageSelector";

const PersistentNavigation = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { signOut } = useAuth();
  
  const navigationItems = [
    {
      to: "/",
      icon: Users,
      label: "Home",
      isActive: location.pathname === "/"
    },
    {
      to: "/database",
      icon: Database,
      label: "Database",
      isActive: location.pathname === "/database"
    },
    {
      to: "/reports",
      icon: BarChart3,
      label: "Report",
      isActive: location.pathname === "/reports"
    },
    {
      to: "/history",
      icon: History,
      label: "Cronologia",
      isActive: location.pathname === "/history"
    },
    {
      to: "/settings",
      icon: Settings,
      label: "Impostazioni",
      isActive: location.pathname === "/settings"
    }
  ];

  if (isMobile) {
    return (
      <>
        {/* Top bar mobile - minimal */}
        <nav className="bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2.5 fixed top-0 left-0 right-0 z-50">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex-shrink-0">
              <h1 className="text-lg font-semibold gradient-text">Lead Manager</h1>
            </Link>
            <div className="flex items-center gap-2">
              <MarketSelector />
              <LanguageSelector variant="mobile" />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={signOut}
                className="text-destructive hover:bg-destructive/10 h-9 w-9"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </nav>

        {/* Bottom tab bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around px-1 py-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-[56px] transition-colors active:scale-95 ${
                    item.isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className={`p-1 rounded-lg transition-colors ${
                    item.isActive ? 'bg-primary/15' : ''
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`text-[10px] font-medium leading-tight ${
                    item.isActive ? 'text-primary' : ''
                  }`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </>
    );
  }

  return (
    <nav className="bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 min-w-0 flex-1">
            <Link to="/" className="flex-shrink-0">
              <h1 className="text-xl font-bold gradient-text whitespace-nowrap">Lead Manager</h1>
            </Link>
            <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.to} to={item.to}>
                    <Button 
                      variant={item.isActive ? "default" : "ghost"} 
                      className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground justify-start whitespace-nowrap px-3 py-2 active:scale-95 transition-all"
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4 mr-4">
            <MarketSelector />
          </div>
          <div className="flex-shrink-0">
            <Button 
              variant="ghost" 
              onClick={signOut}
              className="flex items-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Esci</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default PersistentNavigation;
