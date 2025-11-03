-- Add missing INSERT and UPDATE policies for assignment_history
CREATE POLICY "Authenticated users can insert assignment history"
ON public.assignment_history
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update assignment history"
ON public.assignment_history
FOR UPDATE
TO authenticated
USING (true);