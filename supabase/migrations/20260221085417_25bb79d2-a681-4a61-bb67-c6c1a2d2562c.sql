
-- Tabella mapping fonte lead <-> fonte calendario (uno-a-uno)
CREATE TABLE public.fonte_mapping (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fonte_lead text NOT NULL UNIQUE,
  fonte_calendario text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fonte_mapping ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can manage fonte_mapping"
ON public.fonte_mapping FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can view fonte_mapping"
ON public.fonte_mapping FOR SELECT
USING (true);

-- Trigger per updated_at
CREATE TRIGGER update_fonte_mapping_updated_at
BEFORE UPDATE ON public.fonte_mapping
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp_column();
