-- Simply drop the restrictive policies - the old permissive ones are still there
DROP POLICY IF EXISTS "Authenticated users can view lead generation" ON public.lead_generation;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.lead_generation;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.lead_generation;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.lead_generation;

DROP POLICY IF EXISTS "Authenticated users can view booked calls" ON public.booked_call;
DROP POLICY IF EXISTS "Authenticated users can insert booked calls" ON public.booked_call;
DROP POLICY IF EXISTS "Authenticated users can update booked calls" ON public.booked_call;
DROP POLICY IF EXISTS "Authenticated users can delete booked calls" ON public.booked_call;

DROP POLICY IF EXISTS "Authenticated users can view lead lavorati" ON public.lead_lavorati;
DROP POLICY IF EXISTS "Authenticated users can insert lead lavorati" ON public.lead_lavorati;
DROP POLICY IF EXISTS "Authenticated users can update lead lavorati" ON public.lead_lavorati;
DROP POLICY IF EXISTS "Authenticated users can delete lead lavorati" ON public.lead_lavorati;

DROP POLICY IF EXISTS "Authenticated users can view booking clicks" ON public.booking_clicks;
DROP POLICY IF EXISTS "Authenticated users can delete booking clicks" ON public.booking_clicks;

DROP POLICY IF EXISTS "Authenticated users can view assignment history" ON public.assignment_history;
DROP POLICY IF EXISTS "Authenticated users can insert assignment history" ON public.assignment_history;
DROP POLICY IF EXISTS "Authenticated users can update assignment history" ON public.assignment_history;
DROP POLICY IF EXISTS "Authenticated users can delete assignment history" ON public.assignment_history;