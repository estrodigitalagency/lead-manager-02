
-- Remove the note column from lead_generation table
ALTER TABLE public.lead_generation DROP COLUMN IF EXISTS note;
