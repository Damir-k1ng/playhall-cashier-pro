ALTER TABLE public.sessions ADD COLUMN package_preset_id uuid REFERENCES public.package_presets(id) DEFAULT NULL;
ALTER TABLE public.sessions ADD COLUMN package_price integer DEFAULT NULL;