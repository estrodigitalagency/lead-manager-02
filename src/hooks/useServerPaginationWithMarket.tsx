import { useState, useEffect, useCallback } from "react";
import { getPaginatedData, PaginatedResult } from "@/services/databaseService";
import { useMarket } from "@/contexts/MarketContext";

type ValidTableName = "lead_generation" | "booked_call" | "lead_lavorati";

interface UseServerPaginationProps<T> {
  tableName: ValidTableName;
  initialPageSize?: number;
  filters?: Record<string, any>;
}

interface UseServerPaginationReturn<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  startIndex: number;
  endIndex: number;
  refetch: () => Promise<void>;
}

export const useServerPaginationWithMarket = <T,>({ 
  tableName,
  initialPageSize = 50,
  filters = {}
}: UseServerPaginationProps<T>): UseServerPaginationReturn<T> => {
  const { selectedMarket } = useMarket();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result: PaginatedResult<T> = await getPaginatedData<T>(
        tableName,
        currentPage,
        pageSize,
        filters,
        selectedMarket  // CRITICO: Usa market dal context
      );
      
      setData(result.data);
      setTotalPages(result.totalPages);
      setTotalItems(result.total);
    } catch (err) {
      console.error(`Error fetching paginated data for ${tableName} (market: ${selectedMarket}):`, err);
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dati');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [tableName, currentPage, pageSize, JSON.stringify(filters), selectedMarket]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset alla prima pagina quando cambia market
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMarket]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset alla prima pagina quando cambia la dimensione
  }, []);

  const canGoNext = currentPage < totalPages;
  const canGoPrevious = currentPage > 1;

  const startIndex = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    goToPage,
    nextPage,
    previousPage,
    setPageSize: handleSetPageSize,
    canGoNext,
    canGoPrevious,
    startIndex,
    endIndex,
    refetch
  };
};