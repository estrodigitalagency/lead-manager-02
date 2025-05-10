
import { useState, useEffect } from "react";
import { fetchAssignmentHistory } from "@/services/sheetsService";

export const useAssignmentHistory = () => {
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchAssignmentHistory();
      setHistory(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch assignment history:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch assignment history"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return { history, loading, error, refreshHistory: loadHistory };
};
