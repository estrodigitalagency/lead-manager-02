-- Step 1: Sblocca 400 lead di CRM4 (13/10 alle 08:07)
UPDATE lead_generation
SET 
  venditore = NULL,
  stato = 'nuovo',
  assignable = false,
  data_assegnazione = NULL,
  updated_at = NOW()
WHERE venditore = 'CRM4'
  AND data_assegnazione >= '2025-10-13 08:07:30'::timestamptz
  AND data_assegnazione <= '2025-10-13 08:08:00'::timestamptz
  AND market = 'IT';

-- Step 2: Sblocca 250 lead di Rocco Alicchio (13/10 alle 08:00)
UPDATE lead_generation
SET 
  venditore = NULL,
  stato = 'nuovo',
  assignable = false,
  data_assegnazione = NULL,
  updated_at = NOW()
WHERE venditore = 'Rocco Alicchio'
  AND data_assegnazione >= '2025-10-13 08:00:20'::timestamptz
  AND data_assegnazione <= '2025-10-13 08:00:30'::timestamptz
  AND market = 'IT';

-- Step 3: Riallinea TUTTI i contatori dei venditori con i dati reali
UPDATE venditori v
SET lead_attuali = COALESCE(lead_count.count, 0)
FROM (
  SELECT 
    (lg.venditore) as venditore_full_name,
    lg.market,
    COUNT(*) as count
  FROM lead_generation lg
  WHERE lg.venditore IS NOT NULL
  GROUP BY lg.venditore, lg.market
) AS lead_count
WHERE (v.nome || ' ' || v.cognome) = lead_count.venditore_full_name
  AND v.market = lead_count.market;

-- Resetta a 0 i venditori senza lead
UPDATE venditori v
SET lead_attuali = 0
WHERE NOT EXISTS (
  SELECT 1 FROM lead_generation lg 
  WHERE lg.venditore = (v.nome || ' ' || v.cognome)
    AND lg.market = v.market
);

-- Step 4: Aggiungi colonna lead_ids a assignment_history
ALTER TABLE assignment_history 
ADD COLUMN IF NOT EXISTS lead_ids UUID[] DEFAULT NULL;

-- Step 5: Crea trigger per sincronizzazione automatica contatori
CREATE OR REPLACE FUNCTION sync_venditore_lead_count()
RETURNS TRIGGER AS $$
DECLARE
  old_venditore_name TEXT;
  new_venditore_name TEXT;
  target_market TEXT;
BEGIN
  target_market := COALESCE(NEW.market, OLD.market);
  
  -- Estrai nome completo venditore vecchio
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    old_venditore_name := OLD.venditore;
  END IF;
  
  -- Estrai nome completo venditore nuovo
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    new_venditore_name := NEW.venditore;
  END IF;
  
  -- Decrementa contatore venditore precedente
  IF old_venditore_name IS NOT NULL AND (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND old_venditore_name != new_venditore_name)) THEN
    UPDATE venditori
    SET lead_attuali = GREATEST(lead_attuali - 1, 0)
    WHERE (nome || ' ' || cognome) = old_venditore_name
      AND market = target_market;
  END IF;
  
  -- Incrementa contatore nuovo venditore
  IF new_venditore_name IS NOT NULL AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND old_venditore_name != new_venditore_name)) THEN
    UPDATE venditori
    SET lead_attuali = lead_attuali + 1
    WHERE (nome || ' ' || cognome) = new_venditore_name
      AND market = target_market;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_venditore_lead_count
AFTER INSERT OR UPDATE OR DELETE ON lead_generation
FOR EACH ROW
EXECUTE FUNCTION sync_venditore_lead_count();

-- Step 6: Backfill lead_ids per assegnazioni recenti (ultimi 30 giorni)
UPDATE assignment_history ah
SET lead_ids = (
  SELECT ARRAY_AGG(lg.id)
  FROM lead_generation lg
  WHERE lg.venditore = ah.venditore
    AND lg.market = ah.market
    AND lg.data_assegnazione >= ah.assigned_at - INTERVAL '10 seconds'
    AND lg.data_assegnazione <= ah.assigned_at + INTERVAL '10 seconds'
    AND (ah.campagna IS NULL OR lg.campagna = ah.campagna)
  LIMIT ah.leads_count
)
WHERE lead_ids IS NULL
  AND assigned_at >= NOW() - INTERVAL '30 days';