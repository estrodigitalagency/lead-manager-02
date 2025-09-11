export interface LeadAssignmentAutomation {
  id: string;
  nome: string;
  attivo: boolean;
  priority: number;
  trigger_field: 'ultima_fonte' | 'fonte' | 'nome' | 'email' | 'telefono' | 'campagna' | 'lead_score' | 'created_at';
  condition_type: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'not_contains';
  condition_value: string;
  action_type: 'assign_to_seller' | 'assign_to_previous_seller';
  target_seller_id?: string;
  sheets_tab_name?: string;
  created_at: string;
  updated_at: string;
}

export interface NewAutomationForm {
  nome: string;
  trigger_field: 'ultima_fonte' | 'fonte' | 'nome' | 'email' | 'telefono' | 'campagna' | 'lead_score' | 'created_at';
  condition_type: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'not_contains';
  condition_value: string;
  action_type: 'assign_to_seller' | 'assign_to_previous_seller';
  target_seller_id?: string;
  sheets_tab_name?: string;
}