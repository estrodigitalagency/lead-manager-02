
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
    { to: "/", icon: Users, label: "Home", isActive: location.pathname === "/" },
    { to: "/database", icon: Database, label: "Database", isActive: location.pathname === "/database" },
    { to: "/reports", icon: BarChart3, label: "Report", isActive: location.pathname === "/reports" },
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-10 min-w-0 flex-1">
            <Link to="/" className="flex-shrink-0">
              <span className="text-xl font-extrabold tracking-tight text-foreground whitespace-nowrap">
                Lead<span className="text-primary">Manager</span>
              </span>
            </Link>
            <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.to} to={item.to}>
                    <button
                      className={`flex items-center gap-2 whitespace-nowrap px-3.5 py-2 h-9 rounded-xl text-sm font-medium transition-all duration-200 ${
                        item.isActive
                          ? 'bg-primary/8 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <Icon className={`h-4 w-4 flex-shrink-0 ${item.isActive ? 'stroke-[2.5]' : ''}`} />
                      <span>{item.label}</span>
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <MarketSelector />
            <div className="w-px h-5 bg-border" />
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/8 h-9 px-3 rounded-xl"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline ml-1.5 text-sm">Esci</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default PersistentNavigation;
