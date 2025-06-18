
-- Aggiungi colonne per memorizzare il bypass del controllo temporale e le fonti incluse
ALTER TABLE public.assignment_history 
ADD COLUMN bypass_time_interval boolean DEFAULT false,
ADD COLUMN fonti_incluse text[] DEFAULT NULL;

-- Aggiungi una colonna per indicare la modalità di filtraggio usata (per compatibilità con i vecchi record)
ALTER TABLE public.assignment_history 
ADD COLUMN source_mode text DEFAULT 'exclude';
