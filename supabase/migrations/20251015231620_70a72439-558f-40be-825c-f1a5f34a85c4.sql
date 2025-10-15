-- Add lock_period_days and trigger_sources to lead_assignment_automations
-- lock_period_days values:
--   NULL or 0: Normal behavior, no automatic re-assignment
--   -1: Always reassign (Workshop mode)
--   > 0: Reassign only within X days (Evergreen mode)

ALTER TABLE lead_assignment_automations 
ADD COLUMN IF NOT EXISTS lock_period_days INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trigger_sources TEXT[] DEFAULT NULL;

COMMENT ON COLUMN lead_assignment_automations.lock_period_days IS 
'Days to lock lead to seller. -1 = always reassign (workshop), >0 = reassign within X days (evergreen), NULL/0 = no automatic reassignment';

COMMENT ON COLUMN lead_assignment_automations.trigger_sources IS 
'Array of source names to match. If specified, overrides condition_value for source matching';