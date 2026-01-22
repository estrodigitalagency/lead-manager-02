import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";

// Types for the unified timeline
export interface TimelineEvent {
  id: string;
  date: string;
  type: 'ingresso' | 'call_prenotata' | 'automation' | 'assegnazione_manuale' | 'azione' | 'vendita';
  title: string;
  description?: string;
  venditore?: string;
  fonte?: string;
  badge?: string;
  badgeVariant?: 'success' | 'error' | 'warning' | 'info' | 'default';
  details?: Record<string, any>;
}

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

interface BookedCallItem {
  id: string;
  created_at: string;
  scheduled_at: string;
  venditore: string | null;
  fonte: string | null;
  stato: string | null;
}

interface AutomationExecutionItem {
  id: string;
  executed_at: string;
  automation_name: string;
  action_taken: string;
  seller_assigned: string | null;
  result: string;
  error_message: string | null;
}

interface AssignmentHistoryItem {
  id: string;
  assigned_at: string;
  venditore: string;
  campagna: string | null;
  leads_count: number;
  assignment_type: string;
  lead_ids: string[] | null;
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
  const [bookedCalls, setBookedCalls] = useState<BookedCallItem[]>([]);
  const [automationExecutions, setAutomationExecutions] = useState<AutomationExecutionItem[]>([]);
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentHistoryItem[]>([]);
  const [actionLogs, setActionLogs] = useState<LeadActionLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!lead || (!lead.email && !lead.telefono)) {
        setHistory([]);
        setBookedCalls([]);
        setAutomationExecutions([]);
        setAssignmentHistory([]);
        setActionLogs([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Build conditions for email/phone match
        const orConditions: string[] = [];
        if (lead.email) {
          orConditions.push(`email.eq.${lead.email}`);
        }
        if (lead.telefono) {
          orConditions.push(`telefono.eq.${lead.telefono}`);
        }
        const orClause = orConditions.join(',');

        // 1. Fetch lead generation history
        let historyQuery = supabase
          .from('lead_generation')
          .select('id, created_at, fonte, ultima_fonte, venditore, data_assegnazione, nome, cognome, email, telefono, vendita_chiusa, fonte_vendita')
          .order('created_at', { ascending: false });

        if (orConditions.length > 0) {
          historyQuery = historyQuery.or(orClause);
        }

        const { data: historyData, error: historyError } = await historyQuery;
        if (historyError) throw historyError;
        setHistory(historyData || []);

        // 2. Fetch booked calls
        let bookedQuery = supabase
          .from('booked_call')
          .select('id, created_at, scheduled_at, venditore, fonte, stato')
          .order('created_at', { ascending: false });

        if (orConditions.length > 0) {
          bookedQuery = bookedQuery.or(orClause);
        }

        const { data: bookedData, error: bookedError } = await bookedQuery;
        if (bookedError) {
          console.error('Error fetching booked calls:', bookedError);
        } else {
          setBookedCalls(bookedData || []);
        }

        // 3. Fetch automation executions for this lead
        const { data: automationData, error: automationError } = await supabase
          .from('automation_executions')
          .select('id, executed_at, automation_name, action_taken, seller_assigned, result, error_message')
          .eq('lead_id', lead.id)
          .order('executed_at', { ascending: false });

        if (automationError) {
          console.error('Error fetching automation executions:', automationError);
        } else {
          setAutomationExecutions(automationData || []);
        }

        // 4. Fetch assignment history where this lead was included
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('assignment_history')
          .select('id, assigned_at, venditore, campagna, leads_count, assignment_type, lead_ids')
          .contains('lead_ids', [lead.id])
          .order('assigned_at', { ascending: false });

        if (assignmentError) {
          console.error('Error fetching assignment history:', assignmentError);
        } else {
          setAssignmentHistory(assignmentData || []);
        }

        // 5. Fetch action logs for this lead
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
        setBookedCalls([]);
        setAutomationExecutions([]);
        setAssignmentHistory([]);
        setActionLogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [lead?.email, lead?.telefono, lead?.id]);

  // Build unified timeline
  const timeline = useMemo((): TimelineEvent[] => {
    if (!lead) return [];

    const events: TimelineEvent[] = [];

    // 1. Ingressi from lead_generation history (sorted by date first to number them)
    const sortedHistory = [...history].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    sortedHistory.forEach((h, index) => {
      const ingressoNumber = index + 1;
      const ingressoLabel = ingressoNumber === 1 ? 'Primo ingresso' : 
                            ingressoNumber === 2 ? 'Secondo ingresso' :
                            ingressoNumber === 3 ? 'Terzo ingresso' :
                            ingressoNumber === 4 ? 'Quarto ingresso' :
                            ingressoNumber === 5 ? 'Quinto ingresso' :
                            `${ingressoNumber}° ingresso`;
      
      events.push({
        id: `ingresso-${h.id}`,
        date: h.created_at,
        type: 'ingresso',
        title: ingressoLabel,
        fonte: h.ultima_fonte || h.fonte || undefined,
        venditore: h.venditore || undefined,
        details: { 
          data_assegnazione: h.data_assegnazione,
          isCurrentLead: h.id === lead.id
        }
      });
    });

    // 2. Booked calls
    bookedCalls.forEach(bc => {
      events.push({
        id: `call-${bc.id}`,
        date: bc.created_at,
        type: 'call_prenotata',
        title: 'Call prenotata',
        venditore: bc.venditore || undefined,
        fonte: bc.fonte || undefined,
        badge: bc.stato || undefined,
        badgeVariant: bc.stato === 'completata' ? 'success' : bc.stato === 'cancellata' ? 'error' : 'info',
        details: { 
          scheduled_at: bc.scheduled_at, 
          stato: bc.stato 
        }
      });
    });

    // 3. Automation executions
    automationExecutions.forEach(ae => {
      events.push({
        id: `auto-${ae.id}`,
        date: ae.executed_at,
        type: 'automation',
        title: ae.automation_name,
        venditore: ae.seller_assigned || undefined,
        badge: ae.result,
        badgeVariant: ae.result === 'success' ? 'success' : ae.result === 'error' ? 'error' : 'warning',
        details: { 
          action_taken: ae.action_taken,
          error_message: ae.error_message
        }
      });
    });

    // 4. Manual assignments from assignment_history
    assignmentHistory.forEach(ah => {
      events.push({
        id: `assign-${ah.id}`,
        date: ah.assigned_at,
        type: 'assegnazione_manuale',
        title: ah.assignment_type === 'automation' ? 'Assegnazione automatica' : 'Assegnazione manuale',
        venditore: ah.venditore,
        badge: ah.assignment_type,
        badgeVariant: ah.assignment_type === 'automation' ? 'info' : 'default',
        details: { 
          campagna: ah.campagna, 
          leads_count: ah.leads_count 
        }
      });
    });

    // 5. Action logs (reassignments, made assignable, etc.)
    actionLogs.forEach(al => {
      events.push({
        id: `action-${al.id}`,
        date: al.created_at,
        type: 'azione',
        title: getActionTitle(al.action_type),
        venditore: al.new_venditore || undefined,
        badge: al.action_type,
        details: { 
          previous_venditore: al.previous_venditore, 
          notes: al.notes,
          performed_by: al.performed_by
        }
      });
    });

    // 6. Sale (if closed)
    if (lead.vendita_chiusa && lead.data_chiusura) {
      events.push({
        id: `vendita-${lead.id}`,
        date: lead.data_chiusura,
        type: 'vendita',
        title: 'Vendita chiusa',
        venditore: lead.venditore || undefined,
        fonte: lead.fonte_vendita || undefined,
        badgeVariant: 'success',
        details: { 
          importo: lead.importo_vendita,
          percorso: lead.percorso_venduto,
          fonte_vendita: lead.fonte_vendita,
          note_vendita: lead.note_vendita
        }
      });
    }

    // Sort chronologically (oldest first)
    return events.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [lead, history, bookedCalls, automationExecutions, assignmentHistory, actionLogs]);

  return { history, actionLogs, timeline, isLoading, error };
};

// Helper to get readable action titles
function getActionTitle(actionType: string): string {
  switch (actionType) {
    case 'made_assignable':
      return 'Reso assegnabile';
    case 'reassigned':
      return 'Riassegnato';
    case 'manual_assignment':
      return 'Assegnazione manuale';
    case 'automation_assignment':
      return 'Assegnazione automatica';
    default:
      return actionType;
  }
}
