-- Sblocco mirato per catturare i batch corretti del 13/10
-- 1) CRM4: sblocca i primi 400 lead assegnati il 2025-10-13 (batch delle 10:07)
WITH target_crm4 AS (
  SELECT id
  FROM lead_generation
  WHERE venditore = 'CRM4'
    AND market = 'IT'
    AND data_assegnazione::date = '2025-10-13'::date
  ORDER BY data_assegnazione ASC
  LIMIT 400
)
UPDATE lead_generation
SET venditore = NULL,
    stato = 'nuovo',
    assignable = false,
    data_assegnazione = NULL,
    updated_at = NOW()
WHERE id IN (SELECT id FROM target_crm4);

-- 2) Rocco Alicchio: sblocca i primi 250 lead assegnati il 2025-10-13 (batch intorno alle 10:06)
WITH target_rocco AS (
  SELECT id
  FROM lead_generation
  WHERE venditore = 'Rocco Alicchio'
    AND market = 'IT'
    AND data_assegnazione::date = '2025-10-13'::date
  ORDER BY data_assegnazione ASC
  LIMIT 250
)
UPDATE lead_generation
SET venditore = NULL,
    stato = 'nuovo',
    assignable = false,
    data_assegnazione = NULL,
    updated_at = NOW()
WHERE id IN (SELECT id FROM target_rocco);