
import Index from "./pages/Index";
import Database from "./pages/Database";
import History from "./pages/History";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import LeadAssignment from "./pages/LeadAssignment";
import Login from "./pages/Login";

export const navItems = [
  {
    to: "/",
    page: <Index />,
  },
  {
    to: "/database",
    page: <Database />,
  },
  {
    to: "/history",
    page: <History />,
  },
  {
    to: "/reports", 
    page: <Reports />,
  },
  {
    to: "/settings",
    page: <Settings />,
  },
];

// Standalone routes not in navigation
export const standaloneRoutes = [
  {
    to: "/lead-assignment",
    page: <LeadAssignment />,
  },
];

// Public routes that don't require authentication
export const publicRoutes = [
  {
    to: "/login",
    page: <Login />,
  },
];
