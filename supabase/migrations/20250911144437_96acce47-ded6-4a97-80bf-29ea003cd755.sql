-- Create enum for condition types
CREATE TYPE automation_condition_type AS ENUM ('contains', 'equals', 'starts_with', 'ends_with', 'not_contains');

-- Create enum for action types  
CREATE TYPE automation_action_type AS ENUM ('assign_to_seller', 'assign_to_previous_seller');

-- Create lead assignment automations table
CREATE TABLE public.lead_assignment_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  condition_type automation_condition_type NOT NULL,
  condition_value TEXT NOT NULL,
  action_type automation_action_type NOT NULL,
  target_seller_id UUID REFERENCES public.venditori(id),
  sheets_tab_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_assignment_automations ENABLE ROW LEVEL SECURITY;

-- Create policies (allow authenticated users to manage automations)
CREATE POLICY "Authenticated users can view automations" 
ON public.lead_assignment_automations 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can create automations" 
ON public.lead_assignment_automations 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update automations" 
ON public.lead_assignment_automations 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete automations" 
ON public.lead_assignment_automations 
FOR DELETE 
TO authenticated 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lead_assignment_automations_updated_at
BEFORE UPDATE ON public.lead_assignment_automations
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp_column();