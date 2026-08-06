
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Database, BarChart3, Settings, History, LogOut , Rocket } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import MarketSelector from "@/components/MarketSelector";
import LanguageSelector from "@/components/LanguageSelector";

const PersistentNavigation = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { signOut } = useAuth();

  const navigationItems = [
    { to: "/", icon: Users, label: "Home", isActive: location.pathname === "/" },
    { to: "/database", icon: Database, label: "Database", isActive: location.pathname === "/database" },
    { to: "/reports", icon: BarChart3, label: "Report", isActive: location.pathname === "/reports" },
    { to: "/lanci", icon: Rocket, label: "Lanci", isActive: location.pathname === "/lanci" },
    { to: "/history", icon: History, label: "Cronologia", isActive: location.pathname === "/history" },
    { to: "/settings", icon: Settings, label: "Impostazioni", isActive: location.pathname === "/settings" }
  ];

  if (isMobile) {
    return (
      <>
        {/* Top bar — frosted glass */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between px-4 h-14">
            <Link to="/" className="flex-shrink-0">
              <span className="text-lg font-extrabold tracking-tight text-foreground">
                Lead<span className="text-primary">Manager</span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <LanguageSelector variant="mobile" />
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/8 h-9 w-9 rounded-xl"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </nav>

        {/* Bottom tab bar — floating pill style */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+4px)] pt-1">
          <div className="bg-card/90 backdrop-blur-xl rounded-2xl shadow-soft-lg border border-border/40 flex items-center justify-around px-2 py-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[52px] rounded-xl transition-all duration-200 ${
                    item.isActive
                      ? 'text-primary'
                      : 'text-muted-foreground active:scale-95'
                  }`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 ${
                    item.isActive
                      ? 'bg-primary/10 shadow-sm'
                      : ''
                  }`}>
                    <Icon className={`h-[18px] w-[18px] transition-all ${item.isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  </div>
                  <span className={`text-[10px] leading-tight transition-all ${
                    item.isActive ? 'font-semibold text-primary' : 'font-medium'
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-8 min-w-0 flex-1">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-[11px] font-bold">L</span>
              </div>
              <span className="text-[13px] font-semibold tracking-tight text-foreground whitespace-nowrap">
                Lead Manager
              </span>
            </Link>
            <div className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.to} to={item.to}>
                    <button
                      className={`flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 h-8 rounded-md text-[12.5px] font-medium transition-colors duration-150 ${
                        item.isActive
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 flex-shrink-0 stroke-[1.75]" />
                      <span>{item.label}</span>
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <MarketSelector />
            <div className="w-px h-4 bg-border" />
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 px-2.5 rounded-md text-[12.5px]"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden lg:inline ml-1.5">Esci</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default PersistentNavigation;
