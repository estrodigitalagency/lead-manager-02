
-- Add column for excluded sources from included sources
ALTER TABLE public.assignment_history 
ADD COLUMN exclude_from_included text[] DEFAULT NULL;

-- Add comment for the new column
COMMENT ON COLUMN public.assignment_history.exclude_from_included IS 'Array delle fonti escluse dalle fonti incluse durante lassegnazione';
