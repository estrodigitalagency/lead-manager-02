-- Add new column stato_del_lead to lead_generation table
ALTER TABLE public.lead_generation 
ADD COLUMN stato_del_lead text;