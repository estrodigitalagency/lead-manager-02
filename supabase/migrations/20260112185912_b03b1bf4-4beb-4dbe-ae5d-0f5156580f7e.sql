-- Correzione nomi venditori incompleti in lead_generation
UPDATE lead_generation 
SET venditore = 'Alessandra Savoldi', updated_at = now()
WHERE venditore = 'Alessandra';

UPDATE lead_generation 
SET venditore = 'Klizia Costa', updated_at = now()
WHERE venditore = 'Klizia';

UPDATE lead_generation 
SET venditore = 'Sara Spaggiari', updated_at = now()
WHERE venditore = 'Sara';

-- Correzione nomi venditori incompleti in assignment_history
UPDATE assignment_history 
SET venditore = 'Alessandra Savoldi'
WHERE venditore = 'Alessandra';

UPDATE assignment_history 
SET venditore = 'Klizia Costa'
WHERE venditore = 'Klizia';

UPDATE assignment_history 
SET venditore = 'Sara Spaggiari'
WHERE venditore = 'Sara';