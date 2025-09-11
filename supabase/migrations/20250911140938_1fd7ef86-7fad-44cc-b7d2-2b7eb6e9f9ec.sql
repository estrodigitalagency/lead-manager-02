-- Add ultima_fonte field to lead_generation table
ALTER TABLE public.lead_generation 
ADD COLUMN ultima_fonte TEXT;