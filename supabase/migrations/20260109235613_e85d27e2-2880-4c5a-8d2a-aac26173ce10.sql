-- Aggiungi colonne per tracciamento vendite alla tabella lead_generation
ALTER TABLE lead_generation ADD COLUMN IF NOT EXISTS vendita_chiusa BOOLEAN DEFAULT false;
ALTER TABLE lead_generation ADD COLUMN IF NOT EXISTS data_chiusura TIMESTAMP WITH TIME ZONE;
ALTER TABLE lead_generation ADD COLUMN IF NOT EXISTS importo_vendita DECIMAL(10,2);
ALTER TABLE lead_generation ADD COLUMN IF NOT EXISTS percorso_venduto TEXT;
ALTER TABLE lead_generation ADD COLUMN IF NOT EXISTS fonte_vendita TEXT;
ALTER TABLE lead_generation ADD COLUMN IF NOT EXISTS note_vendita TEXT;

-- Crea indice per query su vendite chiuse
CREATE INDEX IF NOT EXISTS idx_lead_generation_vendita_chiusa ON lead_generation(vendita_chiusa) WHERE vendita_chiusa = true;