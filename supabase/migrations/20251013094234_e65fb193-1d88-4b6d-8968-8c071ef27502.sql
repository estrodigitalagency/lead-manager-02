
-- Sblocco mirato: solo i 400 lead CRM4 del batch delle 10:07 (08:07 UTC)
UPDATE lead_generation
SET venditore = NULL,
    stato = 'nuovo',
    assignable = false,
    data_assegnazione = NULL,
    updated_at = NOW()
WHERE venditore LIKE 'CRM4%'
  AND market = 'IT'
  AND data_assegnazione = '2025-10-13 08:07:32.501756+00'::timestamptz;

-- Aggiorna il contatore del venditore CRM4
UPDATE venditori
SET lead_attuali = GREATEST(lead_attuali - 400, 0)
WHERE (nome || ' ' || cognome) LIKE 'CRM4%'
  AND market = 'IT';
