
-- Add venditore column to booked_call table and remove note column
ALTER TABLE public.booked_call 
ADD COLUMN venditore TEXT;

-- Remove the note column
ALTER TABLE public.booked_call 
DROP COLUMN IF EXISTS note;

-- Update the trigger function to also update the venditore field in lead_generation
-- when a call is booked
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
    SET booked_call = TRUE,
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
