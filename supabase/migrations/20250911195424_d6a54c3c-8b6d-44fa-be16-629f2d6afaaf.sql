-- Add market column to venditori table
ALTER TABLE public.venditori 
ADD COLUMN market TEXT NOT NULL DEFAULT 'IT' CHECK (market IN ('IT', 'ES'));

-- Add market column to database_campagne table  
ALTER TABLE public.database_campagne 
ADD COLUMN market TEXT NOT NULL DEFAULT 'IT' CHECK (market IN ('IT', 'ES'));

-- Add market column to lead_generation table
ALTER TABLE public.lead_generation 
ADD COLUMN market TEXT NOT NULL DEFAULT 'IT' CHECK (market IN ('IT', 'ES'));

-- Add market column to booked_call table
ALTER TABLE public.booked_call 
ADD COLUMN market TEXT NOT NULL DEFAULT 'IT' CHECK (market IN ('IT', 'ES'));

-- Add market column to lead_lavorati table
ALTER TABLE public.lead_lavorati 
ADD COLUMN market TEXT NOT NULL DEFAULT 'IT' CHECK (market IN ('IT', 'ES'));

-- Add market column to booking_clicks table
ALTER TABLE public.booking_clicks 
ADD COLUMN market TEXT NOT NULL DEFAULT 'IT' CHECK (market IN ('IT', 'ES'));

-- Add market column to booking_clicks_evergreen table
ALTER TABLE public.booking_clicks_evergreen 
ADD COLUMN market TEXT NOT NULL DEFAULT 'IT' CHECK (market IN ('IT', 'ES'));

-- Add market column to booking_clicks_lancio table
ALTER TABLE public.booking_clicks_lancio 
ADD COLUMN market TEXT NOT NULL DEFAULT 'IT' CHECK (market IN ('IT', 'ES'));

-- Add market column to conferma_partecipazione_webinar table
ALTER TABLE public.conferma_partecipazione_webinar 
ADD COLUMN market TEXT NOT NULL DEFAULT 'IT' CHECK (market IN ('IT', 'ES'));