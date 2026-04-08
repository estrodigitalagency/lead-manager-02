import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center animate-fade-in">
        <h1 className="text-6xl font-extrabold text-foreground mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">Pagina non trovata</p>
        <a href="/" className="text-primary hover:underline font-medium">
          Torna alla Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
