-- Create table to log all lead actions for full traceability
CREATE TABLE public.lead_actions_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  action_type text NOT NULL, -- 'made_assignable', 'reassigned', 'manual_assignment', 'automation_assignment'
  lead_ids uuid[] NOT NULL,
  leads_count integer NOT NULL,
  previous_venditore text,
  new_venditore text,
  source_assignment_id uuid, -- Reference to the original assignment_history record
  performed_by text, -- Could be 'user' or 'system'
  notes text,
  market text NOT NULL DEFAULT 'IT'
);

-- Enable RLS
ALTER TABLE public.lead_actions_log ENABLE ROW LEVEL SECURITY;

-- Create policy for full access
CREATE POLICY "Allow all access to lead_actions_log" 
ON public.lead_actions_log 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_lead_actions_log_created_at ON public.lead_actions_log(created_at DESC);
CREATE INDEX idx_lead_actions_log_action_type ON public.lead_actions_log(action_type);
CREATE INDEX idx_lead_actions_log_market ON public.lead_actions_log(market);

-- Add comment
COMMENT ON TABLE public.lead_actions_log IS 'Log of all actions performed on leads for full traceability';