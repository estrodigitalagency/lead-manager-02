-- Abilita RLS sulle tabelle principali se non già abilitato
ALTER TABLE public.lead_generation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booked_call ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_lavorati ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_clicks_evergreen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_clicks_lancio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_campagne ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_fonti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venditori ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conferma_partecipazione_webinar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fonte_calendar_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venditori_calendly ENABLE ROW LEVEL SECURITY;

-- Policy per lead_generation
CREATE POLICY "Authenticated users can view all leads"
ON public.lead_generation FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert leads"
ON public.lead_generation FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads"
ON public.lead_generation FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete leads"
ON public.lead_generation FOR DELETE
TO authenticated
USING (true);

-- Policy per booked_call
CREATE POLICY "Authenticated users can view all booked calls"
ON public.booked_call FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert booked calls"
ON public.booked_call FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update booked calls"
ON public.booked_call FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete booked calls"
ON public.booked_call FOR DELETE
TO authenticated
USING (true);

-- Policy per lead_lavorati
CREATE POLICY "Authenticated users can view all lead lavorati"
ON public.lead_lavorati FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert lead lavorati"
ON public.lead_lavorati FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update lead lavorati"
ON public.lead_lavorati FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete lead lavorati"
ON public.lead_lavorati FOR DELETE
TO authenticated
USING (true);

-- Policy per booking_clicks e varianti
CREATE POLICY "Authenticated users can view booking clicks"
ON public.booking_clicks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete booking clicks"
ON public.booking_clicks FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view booking clicks evergreen"
ON public.booking_clicks_evergreen FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete booking clicks evergreen"
ON public.booking_clicks_evergreen FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view booking clicks lancio"
ON public.booking_clicks_lancio FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete booking clicks lancio"
ON public.booking_clicks_lancio FOR DELETE
TO authenticated
USING (true);

-- Policy per assignment_history
CREATE POLICY "Authenticated users can view assignment history"
ON public.assignment_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete assignment history"
ON public.assignment_history FOR DELETE
TO authenticated
USING (true);

-- Policy per database_campagne
CREATE POLICY "Authenticated users can view campaigns"
ON public.database_campagne FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage campaigns"
ON public.database_campagne FOR ALL
TO authenticated
USING (true);

-- Policy per database_fonti
CREATE POLICY "Authenticated users can view fonti"
ON public.database_fonti FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage fonti"
ON public.database_fonti FOR ALL
TO authenticated
USING (true);

-- Policy per venditori
CREATE POLICY "Authenticated users can view venditori"
ON public.venditori FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage venditori"
ON public.venditori FOR ALL
TO authenticated
USING (true);

-- Policy per lead_assignment_automations
CREATE POLICY "Authenticated users can view automations"
ON public.lead_assignment_automations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage automations"
ON public.lead_assignment_automations FOR ALL
TO authenticated
USING (true);

-- Policy per system_settings
CREATE POLICY "Authenticated users can view settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage settings"
ON public.system_settings FOR ALL
TO authenticated
USING (true);

-- Policy per conferma_partecipazione_webinar
CREATE POLICY "Authenticated users can view webinar confirmations"
ON public.conferma_partecipazione_webinar FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete webinar confirmations"
ON public.conferma_partecipazione_webinar FOR DELETE
TO authenticated
USING (true);

-- Policy per fonte_calendar_conditions
CREATE POLICY "Authenticated users can view calendar conditions"
ON public.fonte_calendar_conditions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage calendar conditions"
ON public.fonte_calendar_conditions FOR ALL
TO authenticated
USING (true);

-- Policy per venditori_calendly
CREATE POLICY "Authenticated users can view venditori calendly"
ON public.venditori_calendly FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage venditori calendly"
ON public.venditori_calendly FOR ALL
TO authenticated
USING (true);