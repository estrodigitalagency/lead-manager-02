-- Fix all RLS policies for anon role to allow full CRUD operations
-- This app doesn't use authentication, so anon needs full access

-- Venditori: INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Anon can insert venditori" ON public.venditori;
CREATE POLICY "Anon can insert venditori"
ON public.venditori
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update venditori" ON public.venditori;
CREATE POLICY "Anon can update venditori"
ON public.venditori
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete venditori" ON public.venditori;
CREATE POLICY "Anon can delete venditori"
ON public.venditori
FOR DELETE
TO anon
USING (true);

-- Database Campagne: INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Anon can insert database_campagne" ON public.database_campagne;
CREATE POLICY "Anon can insert database_campagne"
ON public.database_campagne
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update database_campagne" ON public.database_campagne;
CREATE POLICY "Anon can update database_campagne"
ON public.database_campagne
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete database_campagne" ON public.database_campagne;
CREATE POLICY "Anon can delete database_campagne"
ON public.database_campagne
FOR DELETE
TO anon
USING (true);

-- Lead Assignment Automations: INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Anon can insert lead_assignment_automations" ON public.lead_assignment_automations;
CREATE POLICY "Anon can insert lead_assignment_automations"
ON public.lead_assignment_automations
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update lead_assignment_automations" ON public.lead_assignment_automations;
CREATE POLICY "Anon can update lead_assignment_automations"
ON public.lead_assignment_automations
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete lead_assignment_automations" ON public.lead_assignment_automations;
CREATE POLICY "Anon can delete lead_assignment_automations"
ON public.lead_assignment_automations
FOR DELETE
TO anon
USING (true);

-- Database Fonti: INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Anon can insert database_fonti" ON public.database_fonti;
CREATE POLICY "Anon can insert database_fonti"
ON public.database_fonti
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update database_fonti" ON public.database_fonti;
CREATE POLICY "Anon can update database_fonti"
ON public.database_fonti
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete database_fonti" ON public.database_fonti;
CREATE POLICY "Anon can delete database_fonti"
ON public.database_fonti
FOR DELETE
TO anon
USING (true);

-- System Settings: INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Anon can insert system_settings" ON public.system_settings;
CREATE POLICY "Anon can insert system_settings"
ON public.system_settings
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update system_settings" ON public.system_settings;
CREATE POLICY "Anon can update system_settings"
ON public.system_settings
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete system_settings" ON public.system_settings;
CREATE POLICY "Anon can delete system_settings"
ON public.system_settings
FOR DELETE
TO anon
USING (true);

-- Automation Executions: INSERT
DROP POLICY IF EXISTS "Anon can insert automation_executions" ON public.automation_executions;
CREATE POLICY "Anon can insert automation_executions"
ON public.automation_executions
FOR INSERT
TO anon
WITH CHECK (true);