-- Fix: Allow platform owners to read their own user record via Supabase client.
-- Migration 20260313002827 restricted the users table to service_role only,
-- which broke the platform owner login flow. This policy adds back the minimum
-- necessary access: a platform_owner can SELECT only their own row.
CREATE POLICY "platform_owner_read_own_record"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid() AND role = 'platform_owner');
