-- Create automation executions history table
CREATE TABLE public.automation_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID NOT NULL,
  automation_name TEXT NOT NULL,
  lead_id UUID NOT NULL,
  lead_email TEXT,
  lead_name TEXT,
  trigger_field TEXT NOT NULL,
  trigger_value TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  seller_assigned TEXT,
  seller_id UUID,
  webhook_sent BOOLEAN DEFAULT false,
  webhook_success BOOLEAN DEFAULT false,
  result TEXT NOT NULL, -- 'success', 'error', 'no_seller_found'
  error_message TEXT,
  execution_source TEXT NOT NULL, -- 'webhook' or 'manual_processing'
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  market TEXT NOT NULL DEFAULT 'IT',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

-- Create policies for automation executions
CREATE POLICY "Automation executions are viewable by everyone" 
ON public.automation_executions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert automation executions" 
ON public.automation_executions 
FOR INSERT 
WITH CHECK (true);

-- Add foreign key constraints
ALTER TABLE public.automation_executions 
ADD CONSTRAINT automation_executions_automation_id_fkey 
FOREIGN KEY (automation_id) REFERENCES public.lead_assignment_automations(id);

ALTER TABLE public.automation_executions 
ADD CONSTRAINT automation_executions_lead_id_fkey 
FOREIGN KEY (lead_id) REFERENCES public.lead_generation(id);

-- Create indexes for better performance
CREATE INDEX idx_automation_executions_automation_id ON public.automation_executions(automation_id);
CREATE INDEX idx_automation_executions_lead_id ON public.automation_executions(lead_id);
CREATE INDEX idx_automation_executions_executed_at ON public.automation_executions(executed_at DESC);
CREATE INDEX idx_automation_executions_market ON public.automation_executions(market);
CREATE INDEX idx_automation_executions_result ON public.automation_executions(result);