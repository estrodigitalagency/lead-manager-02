-- Drop the existing foreign key constraint
ALTER TABLE public.automation_executions 
DROP CONSTRAINT IF EXISTS automation_executions_lead_id_fkey;

-- Re-add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE public.automation_executions 
ADD CONSTRAINT automation_executions_lead_id_fkey 
FOREIGN KEY (lead_id) 
REFERENCES public.lead_generation(id) 
ON DELETE CASCADE;