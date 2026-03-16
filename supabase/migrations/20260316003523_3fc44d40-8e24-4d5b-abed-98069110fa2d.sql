ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_owner_read_own_record" ON public.users;

CREATE POLICY "platform_owner_read_own_record"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
  AND role = 'platform_owner'
);