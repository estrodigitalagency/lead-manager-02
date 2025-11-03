-- Fix critical security issues: Enable RLS on tables missing it

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add policies for profiles (allow all for anon since no auth)
DROP POLICY IF EXISTS "Anon can view profiles" ON public.profiles;
CREATE POLICY "Anon can view profiles"
ON public.profiles
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Anon can insert profiles" ON public.profiles;
CREATE POLICY "Anon can insert profiles"
ON public.profiles
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update profiles" ON public.profiles;
CREATE POLICY "Anon can update profiles"
ON public.profiles
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete profiles" ON public.profiles;
CREATE POLICY "Anon can delete profiles"
ON public.profiles
FOR DELETE
TO anon
USING (true);

-- Enable RLS on lead_assignments table
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;

-- Add policies for lead_assignments
DROP POLICY IF EXISTS "Anon can view lead_assignments" ON public.lead_assignments;
CREATE POLICY "Anon can view lead_assignments"
ON public.lead_assignments
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Anon can insert lead_assignments" ON public.lead_assignments;
CREATE POLICY "Anon can insert lead_assignments"
ON public.lead_assignments
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update lead_assignments" ON public.lead_assignments;
CREATE POLICY "Anon can update lead_assignments"
ON public.lead_assignments
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete lead_assignments" ON public.lead_assignments;
CREATE POLICY "Anon can delete lead_assignments"
ON public.lead_assignments
FOR DELETE
TO anon
USING (true);

-- Enable RLS on uptime_monitoring table
ALTER TABLE public.uptime_monitoring ENABLE ROW LEVEL SECURITY;

-- Add policies for uptime_monitoring
DROP POLICY IF EXISTS "Anon can view uptime_monitoring" ON public.uptime_monitoring;
CREATE POLICY "Anon can view uptime_monitoring"
ON public.uptime_monitoring
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Anon can insert uptime_monitoring" ON public.uptime_monitoring;
CREATE POLICY "Anon can insert uptime_monitoring"
ON public.uptime_monitoring
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can update uptime_monitoring" ON public.uptime_monitoring;
CREATE POLICY "Anon can update uptime_monitoring"
ON public.uptime_monitoring
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can delete uptime_monitoring" ON public.uptime_monitoring;
CREATE POLICY "Anon can delete uptime_monitoring"
ON public.uptime_monitoring
FOR DELETE
TO anon
USING (true);