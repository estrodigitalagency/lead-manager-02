-- Velocizza findPreviousSeller (riassegnazione automatica): era Seq Scan su 90k righe (~2.7s/query).
-- Indici trigram su email/telefono → ilike usa Bitmap Index Scan (~0.75ms). ~3700x più veloce.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_lg_email_trgm
  ON public.lead_generation USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_lg_telefono_trgm
  ON public.lead_generation USING gin (telefono gin_trgm_ops);

-- Indice parziale per lo scan dei lead già assegnati per market, ordinati per ingresso.
CREATE INDEX IF NOT EXISTS idx_lg_market_created
  ON public.lead_generation (market, created_at DESC)
  WHERE venditore IS NOT NULL AND data_assegnazione IS NOT NULL;

ANALYZE public.lead_generation;
