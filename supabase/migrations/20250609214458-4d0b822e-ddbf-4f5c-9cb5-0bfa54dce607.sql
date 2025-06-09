
-- Add the missing columns to the venditori table
ALTER TABLE public.venditori 
ADD COLUMN delivery_method text DEFAULT 'webhook' CHECK (delivery_method IN ('sheets', 'webhook')),
ADD COLUMN webhook_url text;

-- Update existing records to have a default delivery method
UPDATE public.venditori 
SET delivery_method = 'sheets' 
WHERE delivery_method IS NULL;

-- Make delivery_method not null after setting defaults
ALTER TABLE public.venditori 
ALTER COLUMN delivery_method SET NOT NULL;
