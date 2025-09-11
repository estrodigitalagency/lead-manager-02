-- Add trigger_when field to lead_assignment_automations table
ALTER TABLE public.lead_assignment_automations 
ADD COLUMN trigger_when text NOT NULL DEFAULT 'duplicate_different_source';

-- Add comment for clarity
COMMENT ON COLUMN public.lead_assignment_automations.trigger_when IS 'When to trigger the automation: new_lead, duplicate_different_source';