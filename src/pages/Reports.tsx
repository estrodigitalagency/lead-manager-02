
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ReportFilters, ReportMetrics, getReportMetrics } from "@/services/reportsService";
import ReportFiltersComponent from "@/components/reports/ReportFilters";
import ReportMetricsComponent from "@/components/reports/ReportMetrics";

const ReportsPage = () => {
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<ReportFilters>({});
  const [metrics, setMetrics] = useState<ReportMetrics>({
    leadTotaliGenerati: 0,
    callTotaliPrenotate: 0,
    leadTotaliLavorati: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const reportMetrics = await getReportMetrics(filters);
      setMetrics(reportMetrics);
    } catch (error) {
      console.error('Error loading report metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Carica le metriche all'avvio
  useEffect(() => {
    loadMetrics();
  }, []);

  const handleApplyFilters = () => {
    loadMetrics();
  };

  return (
    <div className={`container mx-auto px-4 py-8 ${isMobile ? 'px-2 py-4' : ''}`}>
      <div className={`flex justify-between items-center mb-8 ${isMobile ? 'flex-col gap-4' : ''}`}>
        <div className={`flex items-center gap-4 ${isMobile ? 'flex-col text-center' : ''}`}>
          <Link to="/">
            <Button variant="outline" size="icon" className="border">
              <ArrowLeft className="h-4 w-4 text-primary" />
            </Button>
          </Link>
          <h1 className={`text-3xl font-bold text-primary flex items-center gap-2 ${isMobile ? 'text-2xl' : ''}`}>
            <BarChart3 className="h-8 w-8" />
            Report e Analytics
          </h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Filtri */}
        <ReportFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          onApplyFilters={handleApplyFilters}
        />

        {/* Metriche Principali */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Metriche Principali</h2>
          <ReportMetricsComponent metrics={metrics} isLoading={isLoading} />
        </div>

        {/* Informazioni sui Filtri Attivi */}
        {(filters.startDate || filters.endDate || filters.fonte || filters.venditore) && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-2">Filtri Attivi:</h3>
            <div className="text-sm text-blue-600 space-y-1">
              {filters.startDate && (
                <div>Data inizio: {new Date(filters.startDate).toLocaleDateString('it-IT')}</div>
              )}
              {filters.endDate && (
                <div>Data fine: {new Date(filters.endDate).toLocaleDateString('it-IT')}</div>
              )}
              {filters.fonte && <div>Fonte: {filters.fonte}</div>}
              {filters.venditore && <div>Venditore: {filters.venditore}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
