-- Add campagna field to lead_assignment_automations table
ALTER TABLE public.lead_assignment_automations 
ADD COLUMN campagna text;