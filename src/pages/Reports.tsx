
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMarket } from "@/contexts/MarketContext";
import { ReportFilters, ReportMetrics, getReportMetrics } from "@/services/reportsService";
import ReportFiltersComponent from "@/components/reports/ReportFilters";
import ReportMetricsComponent from "@/components/reports/ReportMetrics";
import { LeadsBySourceChart } from "@/components/LeadsBySourceChart";
import ReportLeadsList from "@/components/reports/ReportLeadsList";

const ReportsPage = () => {
  const isMobile = useIsMobile();
  const { selectedMarket } = useMarket();
  const [filters, setFilters] = useState<ReportFilters>({});
  const [metrics, setMetrics] = useState<ReportMetrics>({
    leadTotaliGenerati: 0,
    callTotaliPrenotate: 0,
    leadTotaliLavorati: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const filtersWithMarket = { ...filters, market: selectedMarket };
      const reportMetrics = await getReportMetrics(filtersWithMarket);
      setMetrics(reportMetrics);
    } catch (error) {
      console.error('Error loading report metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Carica le metriche all'avvio e quando cambia il mercato
  useEffect(() => {
    loadMetrics();
  }, [selectedMarket]);

  const handleApplyFilters = () => {
    loadMetrics();
    setRefreshTrigger(prev => prev + 1);
  };

  const hasActiveFilters = () => {
    return filters.startDate || 
           filters.endDate || 
           filters.fonte || 
           filters.venditore ||
           (filters.fontiIncluse && filters.fontiIncluse.length > 0) ||
           (filters.fontiEscluse && filters.fontiEscluse.length > 0);
  };

  return (
    <div className={`container mx-auto px-4 py-8 ${isMobile ? 'px-2 py-4 pt-16 pb-24' : 'pt-20'}`}>
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

        {/* Grafico Lead per Fonte */}
        <LeadsBySourceChart filters={filters} refreshTrigger={refreshTrigger} />

        {/* Dettaglio Lead Filtrati */}
        <ReportLeadsList filters={filters} refreshTrigger={refreshTrigger} />

        {/* Informazioni sui Filtri Attivi */}
        {hasActiveFilters() && (
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <h3 className="font-medium text-primary mb-2">Filtri Attivi:</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              {filters.startDate && (
                <div>Data inizio: {new Date(filters.startDate).toLocaleDateString('it-IT')}</div>
              )}
              {filters.endDate && (
                <div>Data fine: {new Date(filters.endDate).toLocaleDateString('it-IT')}</div>
              )}
              {filters.fonte && <div>Fonte: {filters.fonte}</div>}
              {filters.venditore && <div>Venditore: {filters.venditore}</div>}
              {filters.fontiIncluse && filters.fontiIncluse.length > 0 && (
                <div>Fonti incluse: {filters.fontiIncluse.join(', ')}</div>
              )}
              {filters.fontiEscluse && filters.fontiEscluse.length > 0 && (
                <div>Fonti escluse: {filters.fontiEscluse.join(', ')}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
