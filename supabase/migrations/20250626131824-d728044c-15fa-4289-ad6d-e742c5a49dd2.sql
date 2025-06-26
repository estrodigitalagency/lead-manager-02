
-- Aggiungi impostazioni per il controllo duplicati configurabile
INSERT INTO public.system_settings (key, value, descrizione) VALUES 
('duplicate_check_value', '5', 'Valore numerico per l''intervallo di controllo duplicati')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value, descrizione) VALUES 
('duplicate_check_unit', 'minutes', 'Unità di tempo per il controllo duplicati (minutes o hours)')
ON CONFLICT (key) DO NOTHING;
