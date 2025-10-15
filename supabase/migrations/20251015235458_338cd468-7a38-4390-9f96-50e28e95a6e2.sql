-- Migrate condition_value from TEXT to TEXT[] in lead_assignment_automations table
-- First, convert existing single values to arrays
ALTER TABLE lead_assignment_automations 
  ALTER COLUMN condition_value TYPE TEXT[] 
  USING ARRAY[condition_value]::TEXT[];