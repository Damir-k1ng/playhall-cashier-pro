
-- Add 'expired' to tenant_status enum
ALTER TYPE public.tenant_status ADD VALUE IF NOT EXISTS 'expired';

-- Plans table
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_monthly integer NOT NULL,
  currency text NOT NULL DEFAULT 'KZT',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access for plans" ON public.plans FOR ALL USING (true) WITH CHECK (true);

-- Billing cycles table
CREATE TABLE public.billing_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  months integer NOT NULL,
  discount_percent integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access for billing_cycles" ON public.billing_cycles FOR ALL USING (true) WITH CHECK (true);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  billing_cycle_id uuid NOT NULL REFERENCES public.billing_cycles(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access for subscriptions" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);

-- Billing payments table
CREATE TABLE public.billing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'KZT',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access for billing_payments" ON public.billing_payments FOR ALL USING (true) WITH CHECK (true);

-- Seed the default plan
INSERT INTO public.plans (id, name, price_monthly, currency) VALUES
  ('00000000-0000-0000-0000-000000000100', 'Lavé Pro', 14990, 'KZT');

-- Seed billing cycles for that plan
INSERT INTO public.billing_cycles (plan_id, months, discount_percent, label) VALUES
  ('00000000-0000-0000-0000-000000000100', 1, 0, '1 месяц'),
  ('00000000-0000-0000-0000-000000000100', 6, 10, '6 месяцев (−10%)'),
  ('00000000-0000-0000-0000-000000000100', 12, 20, '12 месяцев (−20%)');
