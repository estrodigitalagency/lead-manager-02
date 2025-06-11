
-- Ottimizzazione database per migliorare le performance

-- Indici per lead_generation (tabella principale)
CREATE INDEX IF NOT EXISTS idx_lead_generation_assignable ON lead_generation(assignable) WHERE assignable = true;
CREATE INDEX IF NOT EXISTS idx_lead_generation_venditore ON lead_generation(venditore) WHERE venditore IS NULL;
CREATE INDEX IF NOT EXISTS idx_lead_generation_booked_call ON lead_generation(booked_call);
CREATE INDEX IF NOT EXISTS idx_lead_generation_created_at ON lead_generation(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_generation_email ON lead_generation(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_generation_telefono ON lead_generation(telefono) WHERE telefono IS NOT NULL;

-- Indice composto per query di assegnazione lead (le più frequenti)
CREATE INDEX IF NOT EXISTS idx_lead_assignment_query ON lead_generation(assignable, venditore, booked_call, created_at) 
WHERE assignable = true AND venditore IS NULL AND booked_call != 'SI';

-- Indici per booked_call
CREATE INDEX IF NOT EXISTS idx_booked_call_email ON booked_call(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booked_call_telefono ON booked_call(telefono) WHERE telefono IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booked_call_created_at ON booked_call(created_at);

-- Indici per assignment_history
CREATE INDEX IF NOT EXISTS idx_assignment_history_created_at ON assignment_history(created_at);
CREATE INDEX IF NOT EXISTS idx_assignment_history_venditore ON assignment_history(venditore);

-- Indici per venditori
CREATE INDEX IF NOT EXISTS idx_venditori_stato ON venditori(stato) WHERE stato = 'attivo';

-- Ottimizzazione delle statistiche per il query planner
ANALYZE lead_generation;
ANALYZE booked_call;
ANALYZE assignment_history;
ANALYZE venditori;
