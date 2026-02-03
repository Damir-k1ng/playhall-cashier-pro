-- Add package_count column to sessions table
ALTER TABLE public.sessions 
ADD COLUMN package_count integer NOT NULL DEFAULT 0;

-- Update existing package sessions to have package_count = 1
UPDATE public.sessions 
SET package_count = 1 
WHERE tariff_type = 'package';