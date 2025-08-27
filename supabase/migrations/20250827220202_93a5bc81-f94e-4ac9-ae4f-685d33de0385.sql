-- Drop all RLS policies and disable RLS for all tables

-- assignment_history
DROP POLICY IF EXISTS "Admins only can view assignment_history" ON public.assignment_history;
DROP POLICY IF EXISTS "Managers can insert assignment_history" ON public.assignment_history;
DROP POLICY IF EXISTS "Managers can select assignment_history" ON public.assignment_history;
ALTER TABLE public.assignment_history DISABLE ROW LEVEL SECURITY;

-- booked_call
DROP POLICY IF EXISTS "Admins only can manage booked_call" ON public.booked_call;
DROP POLICY IF EXISTS "Managers can delete booked_call" ON public.booked_call;
DROP POLICY IF EXISTS "Managers can insert booked_call" ON public.booked_call;
DROP POLICY IF EXISTS "Managers can select booked_call" ON public.booked_call;
DROP POLICY IF EXISTS "Managers can update booked_call" ON public.booked_call;
ALTER TABLE public.booked_call DISABLE ROW LEVEL SECURITY;

-- booking_clicks
DROP POLICY IF EXISTS "Admins can manage booking_clicks" ON public.booking_clicks;
DROP POLICY IF EXISTS "Anon can insert booking_clicks" ON public.booking_clicks;
DROP POLICY IF EXISTS "Anon can update booking_clicks for tracking" ON public.booking_clicks;
ALTER TABLE public.booking_clicks DISABLE ROW LEVEL SECURITY;

-- booking_clicks_evergreen
DROP POLICY IF EXISTS "Admins only can manage booking_clicks_evergreen" ON public.booking_clicks_evergreen;
ALTER TABLE public.booking_clicks_evergreen DISABLE ROW LEVEL SECURITY;

-- booking_clicks_lancio
DROP POLICY IF EXISTS "Admins only can manage booking_clicks_lancio" ON public.booking_clicks_lancio;
ALTER TABLE public.booking_clicks_lancio DISABLE ROW LEVEL SECURITY;

-- conferma_partecipazione_webinar
DROP POLICY IF EXISTS "Admins can read webinar confirmations" ON public.conferma_partecipazione_webinar;
DROP POLICY IF EXISTS "Service role can insert webinar confirmations" ON public.conferma_partecipazione_webinar;
ALTER TABLE public.conferma_partecipazione_webinar DISABLE ROW LEVEL SECURITY;

-- database_campagne
DROP POLICY IF EXISTS "Admins only can manage database_campagne" ON public.database_campagne;
DROP POLICY IF EXISTS "Managers can insert database_campagne" ON public.database_campagne;
DROP POLICY IF EXISTS "Managers can select database_campagne" ON public.database_campagne;
DROP POLICY IF EXISTS "Managers can update database_campagne" ON public.database_campagne;
ALTER TABLE public.database_campagne DISABLE ROW LEVEL SECURITY;

-- database_fonti
DROP POLICY IF EXISTS "Admins only can manage database_fonti" ON public.database_fonti;
DROP POLICY IF EXISTS "Managers can insert database_fonti" ON public.database_fonti;
DROP POLICY IF EXISTS "Managers can select database_fonti" ON public.database_fonti;
DROP POLICY IF EXISTS "Managers can update database_fonti" ON public.database_fonti;
ALTER TABLE public.database_fonti DISABLE ROW LEVEL SECURITY;

-- fonte_calendar_conditions
DROP POLICY IF EXISTS "Admins only can manage fonte_calendar_conditions" ON public.fonte_calendar_conditions;
ALTER TABLE public.fonte_calendar_conditions DISABLE ROW LEVEL SECURITY;

-- lead_assignments
DROP POLICY IF EXISTS "Admins only can manage lead_assignments" ON public.lead_assignments;
DROP POLICY IF EXISTS "Managers can delete lead_assignments" ON public.lead_assignments;
DROP POLICY IF EXISTS "Managers can insert lead_assignments" ON public.lead_assignments;
DROP POLICY IF EXISTS "Managers can select lead_assignments" ON public.lead_assignments;
DROP POLICY IF EXISTS "Managers can update lead_assignments" ON public.lead_assignments;
ALTER TABLE public.lead_assignments DISABLE ROW LEVEL SECURITY;

-- lead_generation
DROP POLICY IF EXISTS "Admins only can manage lead_generation" ON public.lead_generation;
DROP POLICY IF EXISTS "Managers can delete lead_generation" ON public.lead_generation;
DROP POLICY IF EXISTS "Managers can insert lead_generation" ON public.lead_generation;
DROP POLICY IF EXISTS "Managers can select lead_generation" ON public.lead_generation;
DROP POLICY IF EXISTS "Managers can update lead_generation" ON public.lead_generation;
ALTER TABLE public.lead_generation DISABLE ROW LEVEL SECURITY;

-- lead_lavorati
DROP POLICY IF EXISTS "Admins only can manage lead_lavorati" ON public.lead_lavorati;
DROP POLICY IF EXISTS "Managers can delete lead_lavorati" ON public.lead_lavorati;
DROP POLICY IF EXISTS "Managers can insert lead_lavorati" ON public.lead_lavorati;
DROP POLICY IF EXISTS "Managers can select lead_lavorati" ON public.lead_lavorati;
DROP POLICY IF EXISTS "Managers can update lead_lavorati" ON public.lead_lavorati;
ALTER TABLE public.lead_lavorati DISABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- system_settings
DROP POLICY IF EXISTS "Admins only can manage system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Managers can delete system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Managers can insert system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Managers can select system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Managers can update system_settings" ON public.system_settings;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;

-- uptime_monitoring
DROP POLICY IF EXISTS "Admins can manage uptime_monitoring" ON public.uptime_monitoring;
DROP POLICY IF EXISTS "Service role can insert uptime_monitoring" ON public.uptime_monitoring;
ALTER TABLE public.uptime_monitoring DISABLE ROW LEVEL SECURITY;

-- venditori
DROP POLICY IF EXISTS "Admins only can manage venditori" ON public.venditori;
DROP POLICY IF EXISTS "Managers can delete venditori" ON public.venditori;
DROP POLICY IF EXISTS "Managers can insert venditori" ON public.venditori;
DROP POLICY IF EXISTS "Managers can select venditori" ON public.venditori;
DROP POLICY IF EXISTS "Managers can update venditori" ON public.venditori;
ALTER TABLE public.venditori DISABLE ROW LEVEL SECURITY;

-- venditori_calendly
DROP POLICY IF EXISTS "Admins only can manage venditori_calendly" ON public.venditori_calendly;
ALTER TABLE public.venditori_calendly DISABLE ROW LEVEL SECURITY;