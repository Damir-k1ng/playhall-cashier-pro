
-- Add slug column to tenants
ALTER TABLE public.tenants ADD COLUMN slug text UNIQUE;

-- Generate slugs for existing tenants
UPDATE public.tenants SET slug = lower(regexp_replace(regexp_replace(club_name, '[^a-zA-Zа-яА-Я0-9\s-]', '', 'g'), '\s+', '-', 'g'));

-- Make slug NOT NULL after populating
ALTER TABLE public.tenants ALTER COLUMN slug SET NOT NULL;

-- Create index for fast lookup
CREATE INDEX idx_tenants_slug ON public.tenants(slug);
