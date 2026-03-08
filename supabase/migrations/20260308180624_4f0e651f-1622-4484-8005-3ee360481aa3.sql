
-- ============================================
-- PHASE 1: Multi-tenant schema foundation
-- ============================================

-- 1. Create tenants table
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_name text NOT NULL,
  plan text NOT NULL DEFAULT 'trial',
  trial_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access for tenants" ON public.tenants FOR ALL USING (true) WITH CHECK (true);

-- 2. Create user_role enum
CREATE TYPE public.user_role AS ENUM ('platform_owner', 'club_admin', 'cashier');

-- 3. Create users table
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE,
  pin_code text,
  password_hash text,
  role public.user_role NOT NULL DEFAULT 'cashier',
  auth_user_id uuid,
  max_discount_percent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_pin_per_tenant UNIQUE (tenant_id, pin_code)
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access for users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- 4. Insert default tenant for existing club
INSERT INTO public.tenants (id, club_name, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'SVOY Club', 'pro');

-- 5. Migrate cashiers → users (preserving IDs for FK compatibility)
INSERT INTO public.users (id, tenant_id, name, pin_code, max_discount_percent, role, created_at)
SELECT 
  c.id,
  '00000000-0000-0000-0000-000000000001',
  c.name,
  c.pin,
  c.max_discount_percent,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.cashier_id = c.id AND ur.role = 'admin')
    THEN 'club_admin'::public.user_role
    ELSE 'cashier'::public.user_role
  END,
  c.created_at
FROM public.cashiers c;

-- 6. Add tenant_id to all operational tables
ALTER TABLE public.stations ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.shifts ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.sessions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.payments ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.controller_usage ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.session_drinks ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.drink_sales ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.drinks ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.inventory ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.inventory_movements ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.reservations ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.bookings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.discount_presets ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.admin_audit_log ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);

-- 7. Backfill all existing data with default tenant
UPDATE public.stations SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.shifts SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.sessions SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.payments SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.controller_usage SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.session_drinks SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.drink_sales SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.drinks SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.inventory SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.inventory_movements SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.reservations SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.bookings SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.discount_presets SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.admin_audit_log SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- 8. Make tenant_id NOT NULL after backfill
ALTER TABLE public.stations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.shifts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.sessions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.payments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.controller_usage ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.session_drinks ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.drink_sales ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.drinks ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.inventory_movements ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.discount_presets ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.admin_audit_log ALTER COLUMN tenant_id SET NOT NULL;

-- 9. Create indexes for tenant_id lookups (performance)
CREATE INDEX idx_stations_tenant ON public.stations(tenant_id);
CREATE INDEX idx_shifts_tenant ON public.shifts(tenant_id);
CREATE INDEX idx_sessions_tenant ON public.sessions(tenant_id);
CREATE INDEX idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX idx_drinks_tenant ON public.drinks(tenant_id);
CREATE INDEX idx_bookings_tenant ON public.bookings(tenant_id);
CREATE INDEX idx_users_tenant ON public.users(tenant_id);
