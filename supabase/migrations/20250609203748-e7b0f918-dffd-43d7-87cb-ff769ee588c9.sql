
-- Creare una tabella dedicata per lo storico delle assegnazioni
CREATE TABLE public.assignment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  leads_count INTEGER NOT NULL,
  venditore TEXT NOT NULL,
  campagna TEXT,
  fonti_escluse TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Aggiungere commento per chiarire l'uso della tabella
COMMENT ON TABLE public.assignment_history IS 'Storico delle assegnazioni automatiche di lead ai venditori';
COMMENT ON COLUMN public.assignment_history.leads_count IS 'Numero di lead assegnati in questa operazione';
COMMENT ON COLUMN public.assignment_history.venditore IS 'Nome del venditore a cui sono stati assegnati i lead';
COMMENT ON COLUMN public.assignment_history.campagna IS 'Campagna di origine dei lead (se presente)';
COMMENT ON COLUMN public.assignment_history.fonti_escluse IS 'Array delle fonti escluse durante lassegnazione';
