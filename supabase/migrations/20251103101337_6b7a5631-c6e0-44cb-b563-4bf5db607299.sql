-- Fix function search path warnings for security

-- Fix update_booking_clicks_on_call function
CREATE OR REPLACE FUNCTION public.update_booking_clicks_on_call()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    attribution_window_minutes INTEGER := 60;
    updated_click_id UUID;
    normalized_phone TEXT;
    normalized_new_phone TEXT;
BEGIN
    IF NEW.telefono IS NOT NULL THEN
        normalized_new_phone := regexp_replace(NEW.telefono, '[^0-9+]', '', 'g');
    END IF;

    UPDATE public.booking_clicks
    SET call_prenotata = 'Si',
        venditore = COALESCE(NEW.venditore, venditore)
    WHERE id = (
        SELECT id FROM public.booking_clicks
        WHERE NEW.email IS NOT NULL 
        AND LOWER(email) = LOWER(NEW.email)
        AND created_at <= NEW.created_at
        AND NEW.created_at <= (created_at + (attribution_window_minutes || ' minutes')::INTERVAL)
        ORDER BY created_at DESC
        LIMIT 1
    )
    RETURNING id INTO updated_click_id;
    
    IF updated_click_id IS NULL AND NEW.telefono IS NOT NULL THEN
        UPDATE public.booking_clicks
        SET call_prenotata = 'Si',
            venditore = COALESCE(NEW.venditore, venditore)
        WHERE id = (
            SELECT bc.id FROM public.booking_clicks bc
            WHERE regexp_replace(bc.telefono, '[^0-9+]', '', 'g') = normalized_new_phone
            AND bc.created_at <= NEW.created_at
            AND NEW.created_at <= (bc.created_at + (attribution_window_minutes || ' minutes')::INTERVAL)
            ORDER BY bc.created_at DESC
            LIMIT 1
        )
        RETURNING id INTO updated_click_id;
        
        IF updated_click_id IS NOT NULL THEN
            RAISE NOTICE 'Call % attribuita al click % tramite telefono (finestra: % minuti)', NEW.id, updated_click_id, attribution_window_minutes;
        END IF;
    END IF;
    
    IF updated_click_id IS NOT NULL AND NEW.email IS NOT NULL THEN
        RAISE NOTICE 'Call % attribuita al click % tramite email (finestra: % minuti)', NEW.id, updated_click_id, attribution_window_minutes;
    ELSIF updated_click_id IS NULL THEN
        RAISE NOTICE 'Nessuna attribuzione per call % - fuori finestra temporale di % minuti', NEW.id, attribution_window_minutes;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Fix sync_venditore_lead_count function
CREATE OR REPLACE FUNCTION public.sync_venditore_lead_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  old_venditore_name TEXT;
  new_venditore_name TEXT;
  target_market TEXT;
BEGIN
  target_market := COALESCE(NEW.market, OLD.market);
  
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    old_venditore_name := OLD.venditore;
  END IF;
  
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    new_venditore_name := NEW.venditore;
  END IF;
  
  IF old_venditore_name IS NOT NULL AND (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND old_venditore_name != new_venditore_name)) THEN
    UPDATE venditori
    SET lead_attuali = GREATEST(lead_attuali - 1, 0)
    WHERE (nome || ' ' || cognome) = old_venditore_name
      AND market = target_market;
  END IF;
  
  IF new_venditore_name IS NOT NULL AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND old_venditore_name != new_venditore_name)) THEN
    UPDATE venditori
    SET lead_attuali = lead_attuali + 1
    WHERE (nome || ' ' || cognome) = new_venditore_name
      AND market = target_market;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;