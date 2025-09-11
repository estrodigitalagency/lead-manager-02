-- Aggiungi il campo trigger_field alla tabella lead_assignment_automations
ALTER TABLE public.lead_assignment_automations 
ADD COLUMN trigger_field text NOT NULL DEFAULT 'ultima_fonte';

-- Aggiorna il commento della tabella per documentare i nuovi campi
COMMENT ON COLUMN public.lead_assignment_automations.trigger_field IS 'Campo su cui applicare la condizione: ultima_fonte, fonte, nome, email, telefono, campagna, lead_score, created_at';