-- Aggiunge filtro "Solo lead nuovi" a livello campagna.
-- enabled: bool default false; mode implicito (se giorni IS NOT NULL → mode 'days', altrimenti se da_data IS NOT NULL → mode 'date').

ALTER TABLE public.database_campagne
  ADD COLUMN IF NOT EXISTS solo_lead_nuovi_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS solo_lead_nuovi_giorni integer,
  ADD COLUMN IF NOT EXISTS solo_lead_nuovi_da_data date;
