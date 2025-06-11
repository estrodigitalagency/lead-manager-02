
-- Remove the note column from lead_generation table if it exists
ALTER TABLE public.lead_generation DROP COLUMN IF EXISTS note;
