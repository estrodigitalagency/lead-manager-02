
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Database, BarChart3, Settings, Menu } from "lucide-react";
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
              className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground w-full justify-start"
            >
              <Icon className="h-4 w-4" />
              {item.label}
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
            <h1 className="text-lg font-semibold text-primary">Lead Management</h1>
            <Drawer open={open} onOpenChange={setOpen}>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="p-4 space-y-2">
                  <h2 className="text-lg font-semibold mb-4">Menu</h2>
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
          <div className="flex items-center gap-1">
            <NavItems />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default PersistentNavigation;
