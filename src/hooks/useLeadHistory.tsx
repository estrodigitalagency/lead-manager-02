import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";

interface LeadHistoryItem {
  id: string;
  created_at: string;
  fonte: string | null;
  ultima_fonte: string | null;
  venditore: string | null;
  data_assegnazione: string | null;
  nome: string;
  cognome: string | null;
  email: string | null;
  telefono: string | null;
  vendita_chiusa: boolean | null;
  fonte_vendita: string | null;
}

export interface LeadActionLogItem {
  id: string;
  created_at: string;
  action_type: string;
  leads_count: number;
  previous_venditore: string | null;
  new_venditore: string | null;
  performed_by: string | null;
  notes: string | null;
}

export const useLeadHistory = (lead: Lead | null) => {
  const [history, setHistory] = useState<LeadHistoryItem[]>([]);
  const [actionLogs, setActionLogs] = useState<LeadActionLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeadHistory = async () => {
      if (!lead || (!lead.email && !lead.telefono)) {
        setHistory([]);
        setActionLogs([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch lead generation history
        let query = supabase
          .from('lead_generation')
          .select('id, created_at, fonte, ultima_fonte, venditore, data_assegnazione, nome, cognome, email, telefono, vendita_chiusa, fonte_vendita')
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

        // Fetch action logs for this lead
        const { data: logsData, error: logsError } = await supabase
          .from('lead_actions_log')
          .select('id, created_at, action_type, leads_count, previous_venditore, new_venditore, performed_by, notes')
          .contains('lead_ids', [lead.id])
          .order('created_at', { ascending: false });

        if (logsError) {
          console.error('Error fetching action logs:', logsError);
        } else {
          setActionLogs(logsData || []);
        }
      } catch (err) {
        console.error('Error fetching lead history:', err);
        setError(err instanceof Error ? err.message : 'Errore nel caricamento dello storico');
        setHistory([]);
        setActionLogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeadHistory();
  }, [lead?.email, lead?.telefono, lead?.id]);

  return { history, actionLogs, isLoading, error };
};