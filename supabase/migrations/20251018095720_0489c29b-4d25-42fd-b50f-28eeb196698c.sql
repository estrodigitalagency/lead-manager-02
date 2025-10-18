-- Correggi lead con booked_call = SI ma assignable = true (dati inconsistenti)
-- Questi lead hanno prenotato una call ma sono ancora marcati come assegnabili
UPDATE lead_generation
SET 
  assignable = false,
  stato = CASE 
    WHEN stato IS NULL OR stato = 'nuovo' THEN 'prenotato'
    ELSE stato
  END
WHERE booked_call = 'SI' 
  AND assignable = true;