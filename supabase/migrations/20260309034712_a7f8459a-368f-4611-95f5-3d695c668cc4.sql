
-- 1. Rename billing_payments → subscription_payments
ALTER TABLE public.billing_payments RENAME TO subscription_payments;

-- 2. Rename the RLS policy
ALTER POLICY "Service role access for billing_payments" ON public.subscription_payments RENAME TO "Service role access for subscription_payments";

-- 3. Unique partial index: only one active subscription per tenant
CREATE UNIQUE INDEX idx_unique_active_subscription_per_tenant 
  ON public.subscriptions (tenant_id) 
  WHERE status = 'active';
