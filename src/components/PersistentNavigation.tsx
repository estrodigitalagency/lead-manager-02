
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Database, BarChart3, Settings, Menu, History } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useState } from "react";

const PersistentNavigation = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  
  const navigationItems = [
    {
      to: "/",
      icon: Users,
      label: "Home",
      isActive: location.pathname === "/"
    },
    {
      to: "/history",
      icon: History,
      label: "Cronologia",
      isActive: location.pathname === "/history"
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

  const NavItems = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      {navigationItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.to} to={item.to} onClick={onItemClick}>
            <Button 
              variant={item.isActive ? "default" : "ghost"} 
              className={`flex items-center gap-2 hover:bg-accent hover:text-accent-foreground justify-start whitespace-nowrap ${
                isMobile ? 'w-full text-base py-3 px-4' : 'px-3 py-2'
              }`}
            >
              <Icon className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} flex-shrink-0`} />
              <span className="truncate">{item.label}</span>
            </Button>
          </Link>
        );
      })}
    </>
  );

  if (isMobile) {
    return (
      <nav className="bg-background border-b border-border px-4 py-3 shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex-shrink-0">
              <h1 className="text-lg font-semibold text-primary truncate">Lead Manager</h1>
            </Link>
            <Drawer open={open} onOpenChange={setOpen}>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="bg-background max-h-[80vh]">
                <div className="p-6 space-y-3 overflow-y-auto">
                  <h2 className="text-xl font-semibold mb-6 text-center">Menu</h2>
                  <NavItems onItemClick={() => setOpen(false)} />
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-background border-b border-border px-4 py-3 shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 min-w-0 flex-1">
            <Link to="/" className="flex-shrink-0">
              <h1 className="text-xl font-bold text-primary whitespace-nowrap">Lead Manager</h1>
            </Link>
            <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
              <NavItems />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default PersistentNavigation;
