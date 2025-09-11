-- Add market column to missing tables

-- assignment_history - per tracciare assegnazioni per market
ALTER TABLE assignment_history 
ADD COLUMN market text NOT NULL DEFAULT 'IT';

-- lead_assignment_automations - per automazioni specifiche per market  
ALTER TABLE lead_assignment_automations 
ADD COLUMN market text NOT NULL DEFAULT 'IT';

-- venditori_calendly - per gestire calendly per market
ALTER TABLE venditori_calendly 
ADD COLUMN market text NOT NULL DEFAULT 'IT';

-- Create indexes for better performance on market filtering
CREATE INDEX idx_assignment_history_market ON assignment_history(market);
CREATE INDEX idx_lead_assignment_automations_market ON lead_assignment_automations(market);
CREATE INDEX idx_venditori_calendly_market ON venditori_calendly(market);