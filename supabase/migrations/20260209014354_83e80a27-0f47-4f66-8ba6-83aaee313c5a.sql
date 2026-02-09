-- Create enum for audit action types
CREATE TYPE public.audit_action_type AS ENUM (
  'edit_session',
  'delete_session',
  'delete_drink_sale',
  'edit_controller'
);

-- Create admin audit log table
CREATE TABLE public.admin_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.cashiers(id),
  action_type audit_action_type NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  shift_id UUID REFERENCES public.shifts(id),
  cashier_name TEXT,
  station_name TEXT,
  old_values JSONB,
  new_values JSONB,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access (through Edge Functions)
CREATE POLICY "Service role access for admin_audit_log"
  ON public.admin_audit_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_log_action_type ON public.admin_audit_log(action_type);