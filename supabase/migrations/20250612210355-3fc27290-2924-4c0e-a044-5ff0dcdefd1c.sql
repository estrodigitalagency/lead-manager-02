
-- Update the lead status logic to only use 'assegnato' and 'assegnabile'
-- First, let's update existing records to use the new states
UPDATE public.lead_generation 
SET stato = CASE 
  WHEN venditore IS NOT NULL THEN 'assegnato'
  WHEN assignable = true AND venditore IS NULL THEN 'assegnabile'
  ELSE 'assegnabile'
END;

-- Update the trigger function to also update the venditore field in lead_generation
-- when a call is booked and set the correct stato
CREATE OR REPLACE FUNCTION public.update_lead_booked_call()
 RETURNS trigger
 LANGUAGE plpgsql
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
    UPDATE public.lead_generation
    SET booked_call = 'SI',
        assignable = false,
        stato = 'assegnato',
        venditore = COALESCE(NEW.venditore, venditore)
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
