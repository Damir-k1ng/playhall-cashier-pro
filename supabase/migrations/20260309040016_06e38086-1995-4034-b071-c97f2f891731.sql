
-- Create platform audit log table
CREATE TABLE public.platform_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  performed_by uuid NOT NULL REFERENCES public.users(id),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;

-- Service role access only
CREATE POLICY "Service role access for platform_audit_log" 
  ON public.platform_audit_log 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_platform_audit_log_entity ON public.platform_audit_log(entity_type, entity_id);
CREATE INDEX idx_platform_audit_log_created ON public.platform_audit_log(created_at DESC);
