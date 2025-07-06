-- Add lead_score column to lead_generation table
ALTER TABLE public.lead_generation 
ADD COLUMN lead_score INTEGER DEFAULT NULL;