-- Add column to store excluded seller names for automations
ALTER TABLE lead_assignment_automations 
ADD COLUMN excluded_sellers TEXT[];

-- Add comment to explain the new column
COMMENT ON COLUMN lead_assignment_automations.excluded_sellers IS 'Array of seller names to exclude from automation. If previous seller matches any of these names, automation will not execute but lead remains assignable.';