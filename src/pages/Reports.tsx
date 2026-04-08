
import { useState, useEffect } from "react";
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

  useEffect(() => {
    loadMetrics();
  }, [selectedMarket]);

  const handleApplyFilters = () => {
    loadMetrics();
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className={`container mx-auto max-w-7xl ${isMobile ? 'px-4 py-5 pt-16 pb-24' : 'px-6 py-8 pt-[72px]'}`}>
      <h1 className="text-xl md:text-2xl font-semibold text-foreground mb-5">Report</h1>
      <div className="space-y-5">
        {/* Filtri - now compact with collapsible details */}
        <ReportFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          onApplyFilters={handleApplyFilters}
        />

        {/* Metriche */}
        <ReportMetricsComponent metrics={metrics} isLoading={isLoading} />

        {/* Grafico Lead per Fonte */}
        <LeadsBySourceChart filters={filters} refreshTrigger={refreshTrigger} />

        {/* Dettaglio Lead Filtrati */}
        <ReportLeadsList filters={filters} refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
};

export default ReportsPage;
