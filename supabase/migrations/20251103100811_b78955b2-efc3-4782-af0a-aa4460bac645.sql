-- Grant read-only access to anon for visibility in the UI

-- Venditori
DROP POLICY IF EXISTS "Anon can view venditori" ON public.venditori;
CREATE POLICY "Anon can view venditori"
ON public.venditori
FOR SELECT
TO anon
USING (true);

-- Campagne
DROP POLICY IF EXISTS "Anon can view database_campagne" ON public.database_campagne;
CREATE POLICY "Anon can view database_campagne"
ON public.database_campagne
FOR SELECT
TO anon
USING (true);

-- Automazioni
DROP POLICY IF EXISTS "Anon can view lead_assignment_automations" ON public.lead_assignment_automations;
CREATE POLICY "Anon can view lead_assignment_automations"
ON public.lead_assignment_automations
FOR SELECT
TO anon
USING (true);

-- System Settings
DROP POLICY IF EXISTS "Anon can view system_settings" ON public.system_settings;
CREATE POLICY "Anon can view system_settings"
ON public.system_settings
FOR SELECT
TO anon
USING (true);

-- Database Fonti
DROP POLICY IF EXISTS "Anon can view database_fonti" ON public.database_fonti;
CREATE POLICY "Anon can view database_fonti"
ON public.database_fonti
FOR SELECT
TO anon
USING (true);

-- Automation Executions
DROP POLICY IF EXISTS "Anon can view automation_executions" ON public.automation_executions;
CREATE POLICY "Anon can view automation_executions"
ON public.automation_executions
FOR SELECT
TO anon
USING (true);