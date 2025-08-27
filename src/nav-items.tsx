
import { HomeIcon, Database, History, Settings, BarChart3 } from "lucide-react";
import { type LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  to: string;
  icon: LucideIcon;
  variant?: "default" | "ghost";
}

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    to: "/",
    icon: HomeIcon,
  },
  {
    title: "Database",
    to: "/database",
    icon: Database,
  },
  {
    title: "Reports",
    to: "/reports",
    icon: BarChart3,
  },
  {
    title: "History",
    to: "/history",
    icon: History,
  },
  {
    title: "Settings",
    to: "/settings",
    icon: Settings,
  },
  {
    title: "Login",
    to: "/auth",
    icon: HomeIcon,
  }
];
