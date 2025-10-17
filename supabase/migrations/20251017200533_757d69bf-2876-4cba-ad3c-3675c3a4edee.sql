
-- Fix temporaneo: aggiorna i lead esistenti senza venditore ma con booked_call = SI
-- copiando il venditore dalla tabella booked_call corrispondente

UPDATE lead_generation lg
SET venditore = bc.venditore,
    data_assegnazione = COALESCE(lg.data_assegnazione, NOW())
FROM booked_call bc
WHERE lg.booked_call = 'SI'
  AND lg.venditore IS NULL
  AND bc.venditore IS NOT NULL
  AND (lg.email = bc.email OR lg.telefono = bc.telefono)
  AND lg.market = bc.market;
