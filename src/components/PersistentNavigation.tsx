
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Database, BarChart3, Settings } from "lucide-react";

const PersistentNavigation = () => {
  const location = useLocation();
  
  const navigationItems = [
    {
      to: "/",
      icon: Users,
      label: "Assegna Lead",
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
      to: "/settings",
      icon: Settings,
      label: "Impostazioni",
      isActive: location.pathname === "/settings"
    }
  ];

  return (
    <nav className="bg-white border-b border-border/30 px-4 py-3 shadow-sm">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to}>
                  <Button 
                    variant={item.isActive ? "default" : "ghost"} 
                    className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default PersistentNavigation;
