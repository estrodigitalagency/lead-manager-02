
-- Aggiungi colonna data_assegnazione per tracciare quando un lead viene assegnato
ALTER TABLE public.lead_generation 
ADD COLUMN data_assegnazione timestamp with time zone;

-- Crea un trigger per aggiornare automaticamente data_assegnazione quando un lead viene assegnato
CREATE OR REPLACE FUNCTION public.update_data_assegnazione()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Se il venditore viene assegnato per la prima volta
    IF OLD.venditore IS NULL AND NEW.venditore IS NOT NULL THEN
        NEW.data_assegnazione = now();
    END IF;
    
    -- Se booked_call cambia da NO/NULL a SI
    IF (OLD.booked_call IS NULL OR OLD.booked_call = 'NO') AND NEW.booked_call = 'SI' THEN
        NEW.data_assegnazione = now();
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Crea il trigger
CREATE TRIGGER trigger_update_data_assegnazione
    BEFORE UPDATE ON public.lead_generation
    FOR EACH ROW
    EXECUTE FUNCTION public.update_data_assegnazione();

-- Aggiorna i lead esistenti che hanno già un venditore o booked_call = 'SI'
-- ma non hanno data_assegnazione (usa updated_at come fallback)
UPDATE public.lead_generation 
SET data_assegnazione = updated_at 
WHERE data_assegnazione IS NULL 
  AND (venditore IS NOT NULL OR booked_call = 'SI');
