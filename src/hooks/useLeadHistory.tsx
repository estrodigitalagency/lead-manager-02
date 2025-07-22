import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";

interface LeadHistoryItem {
  id: string;
  created_at: string;
  fonte: string | null;
  venditore: string | null;
  data_assegnazione: string | null;
  nome: string;
  cognome: string | null;
  email: string | null;
  telefono: string | null;
}

export const useLeadHistory = (lead: Lead | null) => {
  const [history, setHistory] = useState<LeadHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeadHistory = async () => {
      if (!lead || (!lead.email && !lead.telefono)) {
        setHistory([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('lead_generation')
          .select('id, created_at, fonte, venditore, data_assegnazione, nome, cognome, email, telefono')
          .order('created_at', { ascending: false });

        // Build the condition for email or phone match
        const conditions = [];
        if (lead.email) {
          conditions.push(`email.eq.${lead.email}`);
        }
        if (lead.telefono) {
          conditions.push(`telefono.eq.${lead.telefono}`);
        }

        if (conditions.length === 1) {
          query = query.or(conditions[0]);
        } else if (conditions.length === 2) {
          query = query.or(conditions.join(','));
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw fetchError;
        }

        setHistory(data || []);
      } catch (err) {
        console.error('Error fetching lead history:', err);
        setError(err instanceof Error ? err.message : 'Errore nel caricamento dello storico');
        setHistory([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeadHistory();
  }, [lead?.email, lead?.telefono, lead?.id]);

  return { history, isLoading, error };
};