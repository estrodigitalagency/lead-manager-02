-- Add source configuration columns to database_campagne table
ALTER TABLE public.database_campagne 
ADD COLUMN fonti_incluse TEXT[] DEFAULT '{}',
ADD COLUMN fonti_escluse TEXT[] DEFAULT '{}',
ADD COLUMN source_mode TEXT DEFAULT 'exclude' CHECK (source_mode IN ('exclude', 'include')),
ADD COLUMN exclude_from_included TEXT[] DEFAULT '{}';