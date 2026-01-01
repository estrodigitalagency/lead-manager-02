-- Add assignment_type column to track if assignment was manual or automated
ALTER TABLE public.assignment_history 
ADD COLUMN IF NOT EXISTS assignment_type text NOT NULL DEFAULT 'manual';

-- Add comment for documentation
COMMENT ON COLUMN public.assignment_history.assignment_type IS 'Type of assignment: manual or automation';