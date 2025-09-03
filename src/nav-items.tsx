
import Index from "./pages/Index";
import Database from "./pages/Database";
import History from "./pages/History";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import LeadAssignment from "./pages/LeadAssignment";

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
    to: "/lead-assignment",
    page: <LeadAssignment />,
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
