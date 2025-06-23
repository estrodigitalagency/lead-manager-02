
-- Aggiungi colonna per memorizzare le fonti escluse dalle incluse
ALTER TABLE public.assignment_history 
ADD COLUMN exclude_from_included text[] DEFAULT NULL;
