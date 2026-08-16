import { lazy } from "react";

/**
 * Le pagine si caricano quando servono, non tutte all'avvio.
 *
 * Importandole in cima il costruttore le impacchettava in un file solo da due megabyte: chi
 * apriva i lanci scaricava anche database, report, impostazioni e le librerie per PDF ed Excel
 * prima di vedere qualsiasi cosa. Con l'importazione differita ogni pagina diventa un pezzo a
 * sé e all'apertura arriva soltanto quella che si sta guardando.
 */
const Index = lazy(() => import("./pages/Index"));
const Database = lazy(() => import("./pages/Database"));
const History = lazy(() => import("./pages/History"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const LeadAssignment = lazy(() => import("./pages/LeadAssignment"));
const Login = lazy(() => import("./pages/Login"));
const WhatsAppRedirect = lazy(() => import("./pages/WhatsAppRedirect"));
const Ranking = lazy(() => import("./pages/Ranking"));
const Lanci = lazy(() => import("./pages/Lanci"));

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
    to: "/lanci",
    page: <Lanci />,
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
  {
    to: "/wa",
    page: <WhatsAppRedirect />,
  },
  {
    to: "/wa/:slug",
    page: <WhatsAppRedirect />,
  },
  {
    to: "/ranking",
    page: <Ranking />,
  },
];
