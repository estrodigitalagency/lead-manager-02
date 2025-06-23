
import { useState, useCallback, useRef, useEffect } from "react";
import { getAvailableLeadsCount } from "@/services/leadAssignmentService";

interface UseRealTimeLeadCountProps {
  excludedSources: string[];
  includedSources: string[];
  sourceMode: 'exclude' | 'include';
  bypassTimeInterval: boolean;
  excludeFromIncluded: string[];
}

export function useRealTimeLeadCount({
  excludedSources,
  includedSources,
  sourceMode,
  bypassTimeInterval,
  excludeFromIncluded
}: UseRealTimeLeadCountProps) {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateCount = useCallback(async () => {
    // Annulla la richiesta precedente se ancora in corso
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Crea un nuovo controller per questa richiesta
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    
    try {
      console.log(`🔄 Real-time count update triggered with filters:`, {
        sourceMode,
        excludedSources: excludedSources.length,
        includedSources: includedSources.length,
        excludeFromIncluded: excludeFromIncluded.length,
        bypassTimeInterval
      });

      const newCount = await getAvailableLeadsCount(
        excludedSources,
        includedSources,
        sourceMode,
        bypassTimeInterval,
        excludeFromIncluded
      );

      // Verifica che la richiesta non sia stata annullata
      if (!abortControllerRef.current?.signal.aborted) {
        console.log(`✅ Real-time count updated: ${newCount}`);
        setCount(newCount);
      }
    } catch (error) {
      if (!abortControllerRef.current?.signal.aborted) {
        console.error("❌ Error updating real-time count:", error);
        setCount(0);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [excludedSources, includedSources, sourceMode, bypassTimeInterval, excludeFromIncluded]);

  // Aggiorna il conteggio ogni volta che cambiano i parametri
  useEffect(() => {
    console.log(`🔄 Filter parameters changed, updating count...`);
    updateCount();
    
    // Cleanup function per annullare richieste in corso
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [updateCount]);

  // Manual refresh function
  const refreshCount = useCallback(() => {
    console.log(`🔄 Manual refresh triggered`);
    updateCount();
  }, [updateCount]);

  return {
    count,
    isLoading,
    refreshCount
  };
}
