CREATE TABLE public.package_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_hours integer NOT NULL DEFAULT 3,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.package_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access for package_presets" ON public.package_presets
  FOR ALL TO service_role USING (true) WITH CHECK (true);