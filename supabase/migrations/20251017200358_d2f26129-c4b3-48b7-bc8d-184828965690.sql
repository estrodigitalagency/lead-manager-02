
-- Aggiorna il trigger per copiare correttamente il venditore da booked_call a lead_generation
CREATE OR REPLACE FUNCTION public.update_lead_booked_call()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    attribution_window INTEGER;
    updated_lead_id UUID;
BEGIN
    -- Get attribution window setting, default 7 days if not configured
    SELECT COALESCE(
        (SELECT value::integer FROM system_settings WHERE key = 'booking_attribution_window_days'),
        7
    ) INTO attribution_window;

    -- Find and update matching leads for email or phone, 
    -- but only if the lead was created within the attribution interval
    -- IMPORTANTE: Usa sempre il venditore da NEW (booked_call appena inserito)
    UPDATE public.lead_generation
    SET booked_call = 'SI',
        assignable = false,
        stato = 'prenotato',
        venditore = NEW.venditore,  -- CRITICO: Copia sempre il venditore da booked_call
        data_assegnazione = CASE 
            WHEN venditore IS NULL AND NEW.venditore IS NOT NULL 
            THEN NOW() 
            ELSE data_assegnazione 
        END
    WHERE 
        (email = NEW.email OR telefono = NEW.telefono) AND
        created_at >= (NOW() - (attribution_window || ' days')::INTERVAL)
    RETURNING id INTO updated_lead_id;
    
    -- If we found a matching lead, update the lead_id in the booked call
    IF updated_lead_id IS NOT NULL THEN
        NEW.lead_id = updated_lead_id;
    END IF;
    
    RETURN NEW;
END;
$function$;
