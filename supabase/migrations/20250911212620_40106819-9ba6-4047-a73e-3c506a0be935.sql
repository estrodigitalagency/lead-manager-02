-- Add webhook_enabled field to lead_assignment_automations table
ALTER TABLE public.lead_assignment_automations 
ADD COLUMN webhook_enabled boolean NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.lead_assignment_automations.webhook_enabled IS 'Whether to send webhook when assignment action is performed';