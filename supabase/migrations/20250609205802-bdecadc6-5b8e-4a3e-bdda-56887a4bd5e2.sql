
-- Create table for managing lead sources
CREATE TABLE public.database_fonti (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descrizione TEXT,
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for managing campaigns
CREATE TABLE public.database_campagne (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descrizione TEXT,
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add trigger for updated_at timestamp on database_fonti
CREATE TRIGGER update_database_fonti_updated_at
    BEFORE UPDATE ON public.database_fonti
    FOR EACH ROW
    EXECUTE FUNCTION public.update_timestamp_column();

-- Add trigger for updated_at timestamp on database_campagne
CREATE TRIGGER update_database_campagne_updated_at
    BEFORE UPDATE ON public.database_campagne
    FOR EACH ROW
    EXECUTE FUNCTION public.update_timestamp_column();

-- Insert initial sources from existing lead_generation data
INSERT INTO public.database_fonti (nome)
SELECT DISTINCT fonte 
FROM public.lead_generation 
WHERE fonte IS NOT NULL AND fonte != ''
ON CONFLICT (nome) DO NOTHING;

-- Insert initial campaigns from existing lead_generation data
INSERT INTO public.database_campagne (nome)
SELECT DISTINCT campagna 
FROM public.lead_generation 
WHERE campagna IS NOT NULL AND campagna != ''
ON CONFLICT (nome) DO NOTHING;
