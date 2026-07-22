export type DistributionMode = 'percentage' | 'count';

export interface DistributionSlot {
  venditore_id: string;
  weight?: number | null;       // per mode='percentage' (0-100, somma = 100)
  count_target?: number | null; // per mode='count'
  cap?: number | null;          // tetto massimo INDIVIDUALE (opzionale, funziona in entrambe le modalità)
}

export interface DistributionState {
  count_assigned?: Record<string, number>; // venditore_id → n. lead assegnati
  total_assigned?: number;
  last_updated?: string;
}

export interface LeadAssignmentAutomation {
  id: string;
  nome: string;
  attivo: boolean;
  priority: number;
  trigger_when: 'new_lead' | 'duplicate_different_source';
  trigger_field: 'ultima_fonte' | 'fonte' | 'nome' | 'email' | 'telefono' | 'campagna' | 'lead_score' | 'created_at';
  condition_type: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'not_contains';
  condition_value: string[];
  action_type: 'assign_to_seller' | 'assign_to_previous_seller' | 'weighted_distribution';
  target_seller_id?: string;
  sheets_tab_name?: string;
  campagna?: string;
  webhook_enabled: boolean;
  excluded_sellers?: string[];
  lock_period_days?: number;
  // Nuovi campi: distribuzione + fallback previous seller
  use_previous_seller_first?: boolean;
  distribution_enabled?: boolean;
  distribution_mode?: DistributionMode | null;
  distribution_cap_total?: number | null;
  distribution_config?: DistributionSlot[];
  distribution_state?: DistributionState;
  created_at: string;
  updated_at: string;
}

export interface NewAutomationForm {
  nome: string;
  trigger_when: 'new_lead' | 'duplicate_different_source';
  trigger_field: 'ultima_fonte' | 'fonte' | 'nome' | 'email' | 'telefono' | 'campagna' | 'lead_score' | 'created_at';
  condition_type: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'not_contains';
  condition_value: string[];
  action_type: 'assign_to_seller' | 'assign_to_previous_seller' | 'weighted_distribution';
  target_seller_id?: string;
  sheets_tab_name?: string;
  campagna?: string;
  webhook_enabled?: boolean;
  excluded_sellers?: string[];
  lock_period_days?: number;
  lock_period_enabled?: boolean;
  // Distribution
  use_previous_seller_first?: boolean;
  distribution_enabled?: boolean;
  distribution_mode?: DistributionMode;
  distribution_cap_total?: number | null;
  distribution_config?: DistributionSlot[];
}
