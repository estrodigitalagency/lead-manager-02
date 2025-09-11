-- Fase 1: Aggiungere colonna market con DEFAULT 'IT' per zero impact
-- Tutti i dati esistenti diventeranno automaticamente 'IT'

-- Tabella lead_generation (principale)
ALTER TABLE public.lead_generation 
ADD COLUMN market text DEFAULT 'IT' NOT NULL;

-- Tabella venditori
ALTER TABLE public.venditori 
ADD COLUMN market text DEFAULT 'IT' NOT NULL;

-- Tabella database_campagne
ALTER TABLE public.database_campagne 
ADD COLUMN market text DEFAULT 'IT' NOT NULL;

-- Tabella lead_assignment_automations
ALTER TABLE public.lead_assignment_automations 
ADD COLUMN market text DEFAULT 'IT' NOT NULL;

-- Tabella booked_call
ALTER TABLE public.booked_call 
ADD COLUMN market text DEFAULT 'IT' NOT NULL;

-- Tabella lead_lavorati
ALTER TABLE public.lead_lavorati 
ADD COLUMN market text DEFAULT 'IT' NOT NULL;

-- Tabella assignment_history
ALTER TABLE public.assignment_history 
ADD COLUMN market text DEFAULT 'IT' NOT NULL;

-- System settings (con constraint per evitare duplicati key+market)
ALTER TABLE public.system_settings 
ADD COLUMN market text DEFAULT 'IT' NOT NULL;

-- Aggiungi constraint per evitare duplicati key+market in system_settings
ALTER TABLE public.system_settings 
ADD CONSTRAINT unique_key_market UNIQUE (key, market);

-- Crea indici per performance su market
CREATE INDEX idx_lead_generation_market ON public.lead_generation(market);
CREATE INDEX idx_venditori_market ON public.venditori(market);
CREATE INDEX idx_database_campagne_market ON public.database_campagne(market);
CREATE INDEX idx_lead_assignment_automations_market ON public.lead_assignment_automations(market);
CREATE INDEX idx_booked_call_market ON public.booked_call(market);
CREATE INDEX idx_assignment_history_market ON public.assignment_history(market);
CREATE INDEX idx_system_settings_market ON public.system_settings(market);

-- Duplica le impostazioni esistenti per il mercato ES
-- Finestre di attribuzione
INSERT INTO public.system_settings (key, value, descrizione, market)
SELECT key, value, descrizione, 'ES' 
FROM public.system_settings 
WHERE market = 'IT' AND key IN (
  'booking_attribution_window_days',
  'click_to_booking_window_minutes'
);

-- Webhook URLs (vuoti per ora, da configurare in settings)
INSERT INTO public.system_settings (key, value, descrizione, market)
VALUES 
  ('lead_assign_webhook_url', '', 'URL webhook per assegnazione lead mercato ES', 'ES');

-- Constraint per assicurarsi che market sia IT o ES
ALTER TABLE public.lead_generation 
ADD CONSTRAINT check_market_values CHECK (market IN ('IT', 'ES'));

ALTER TABLE public.venditori 
ADD CONSTRAINT check_venditori_market CHECK (market IN ('IT', 'ES'));

ALTER TABLE public.database_campagne 
ADD CONSTRAINT check_campagne_market CHECK (market IN ('IT', 'ES'));

ALTER TABLE public.lead_assignment_automations 
ADD CONSTRAINT check_automations_market CHECK (market IN ('IT', 'ES'));

ALTER TABLE public.booked_call 
ADD CONSTRAINT check_booked_call_market CHECK (market IN ('IT', 'ES'));

ALTER TABLE public.lead_lavorati 
ADD CONSTRAINT check_lavorati_market CHECK (market IN ('IT', 'ES'));

ALTER TABLE public.assignment_history 
ADD CONSTRAINT check_history_market CHECK (market IN ('IT', 'ES'));

ALTER TABLE public.system_settings 
ADD CONSTRAINT check_settings_market CHECK (market IN ('IT', 'ES'));