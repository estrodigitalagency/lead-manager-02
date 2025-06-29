import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseServerPaginationProps<T> {
  tableName: string;
  initialPageSize?: number;
  filters?: Record<string, any>;
}

export const useServerPagination = <T extends Record<string, any>>({
  tableName,
  initialPageSize = 10,
  filters = {}
}: UseServerPaginationProps<T>) => {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const canGoNext = currentPage < totalPages;
  const canGoPrevious = currentPage > 1;
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const nextPage = () => {
    if (canGoNext) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (canGoPrevious) {
      setCurrentPage(currentPage - 1);
    }
  };

  const buildQuery = useCallback(() => {
    let query = supabase.from(tableName).select('*', { count: 'exact' });

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string' && value.startsWith('%') && value.endsWith('%')) {
          // Handle "contains" filter
          query = query.ilike(key, value);
        } else if (typeof value === 'string' && (value.startsWith('%') || value.endsWith('%'))) {
            query = query.like(key, value);
        } else {
          // Handle exact match filter
          query = query.eq(key, value);
        }
      }
    });

    // Nuovo filtro per ID selezionati
    if (filters.selectedIds && Array.isArray(filters.selectedIds) && filters.selectedIds.length > 0) {
      query = query.in('id', filters.selectedIds);
    }

    return query;
  }, [tableName, filters]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = buildQuery()
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
        .order('data', { ascending: false });

      const { data: results, error: queryError, count } = await query;

      if (queryError) {
        throw queryError;
      }

      setData(results || []);
      setTotalItems(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (e: any) {
      setError(e);
      console.error("Errore durante il caricamento dei dati:", e);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, buildQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData, currentPage, pageSize, filters]);

  const refetch = useCallback(() => {
    fetchData();
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
    setPageSize,
    canGoNext,
    canGoPrevious,
    startIndex,
    endIndex,
    refetch
  };
};
