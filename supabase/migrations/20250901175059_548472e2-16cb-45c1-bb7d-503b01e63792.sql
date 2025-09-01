-- Add bypass_time_interval column to database_campagne table
ALTER TABLE public.database_campagne 
ADD COLUMN bypass_time_interval BOOLEAN DEFAULT FALSE;