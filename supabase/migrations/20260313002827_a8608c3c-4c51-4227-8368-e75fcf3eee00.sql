
-- Fix: restrict permissive policies from {public} to {service_role}

-- admin_audit_log
DROP POLICY "Service role access for admin_audit_log" ON public.admin_audit_log;
CREATE POLICY "Service role access for admin_audit_log" ON public.admin_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- billing_cycles
DROP POLICY "Service role access for billing_cycles" ON public.billing_cycles;
CREATE POLICY "Service role access for billing_cycles" ON public.billing_cycles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- discount_presets
DROP POLICY "Service role access for discount_presets" ON public.discount_presets;
CREATE POLICY "Service role access for discount_presets" ON public.discount_presets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- inventory
DROP POLICY "Service role access for inventory" ON public.inventory;
CREATE POLICY "Service role access for inventory" ON public.inventory FOR ALL TO service_role USING (true) WITH CHECK (true);

-- inventory_movements
DROP POLICY "Service role access for inventory_movements" ON public.inventory_movements;
CREATE POLICY "Service role access for inventory_movements" ON public.inventory_movements FOR ALL TO service_role USING (true) WITH CHECK (true);

-- plans
DROP POLICY "Service role access for plans" ON public.plans;
CREATE POLICY "Service role access for plans" ON public.plans FOR ALL TO service_role USING (true) WITH CHECK (true);

-- platform_audit_log
DROP POLICY "Service role access for platform_audit_log" ON public.platform_audit_log;
CREATE POLICY "Service role access for platform_audit_log" ON public.platform_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- subscription_payments
DROP POLICY "Service role access for subscription_payments" ON public.subscription_payments;
CREATE POLICY "Service role access for subscription_payments" ON public.subscription_payments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- subscriptions
DROP POLICY "Service role access for subscriptions" ON public.subscriptions;
CREATE POLICY "Service role access for subscriptions" ON public.subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- tenants
DROP POLICY "Service role access for tenants" ON public.tenants;
CREATE POLICY "Service role access for tenants" ON public.tenants FOR ALL TO service_role USING (true) WITH CHECK (true);

-- users
DROP POLICY "Service role access for users" ON public.users;
CREATE POLICY "Service role access for users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
