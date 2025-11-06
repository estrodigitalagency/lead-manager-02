-- Add manually_not_assignable field to lead_generation table
ALTER TABLE public.lead_generation 
ADD COLUMN manually_not_assignable boolean DEFAULT false;

-- Update the comment for clarity
COMMENT ON COLUMN public.lead_generation.manually_not_assignable IS 'Flag to mark leads that should not be assignable manually';