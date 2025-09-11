-- Drop all RLS policies from lead_assignment_automations table
DROP POLICY IF EXISTS "Authenticated users can view automations" ON public.lead_assignment_automations;
DROP POLICY IF EXISTS "Authenticated users can create automations" ON public.lead_assignment_automations;
DROP POLICY IF EXISTS "Authenticated users can update automations" ON public.lead_assignment_automations;
DROP POLICY IF EXISTS "Authenticated users can delete automations" ON public.lead_assignment_automations;

-- Disable RLS on the table completely
ALTER TABLE public.lead_assignment_automations DISABLE ROW LEVEL SECURITY;