
-- =============================================
-- SECURITY DEFINER FUNCTIONS (avoid RLS recursion)
-- =============================================

-- Get tenant_id for the current authenticated user
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_auth_uid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.users
  WHERE auth_user_id = _auth_uid
  LIMIT 1
$$;

-- Check if the current user is a platform_owner
CREATE OR REPLACE FUNCTION public.is_platform_owner(_auth_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = _auth_uid
      AND role = 'platform_owner'
  )
$$;

-- =============================================
-- USERS TABLE: allow authenticated users to read their own tenant's users
-- =============================================
DROP POLICY IF EXISTS "tenant_users_read" ON public.users;
CREATE POLICY "tenant_users_read"
ON public.users
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- =============================================
-- TENANT-ISOLATED RLS POLICIES ON POS TABLES
-- Pattern: service_role keeps full access, authenticated gets tenant-scoped read
-- =============================================

-- STATIONS
DROP POLICY IF EXISTS "tenant_isolation_stations" ON public.stations;
CREATE POLICY "tenant_isolation_stations"
ON public.stations
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- SESSIONS
DROP POLICY IF EXISTS "tenant_isolation_sessions" ON public.sessions;
CREATE POLICY "tenant_isolation_sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- PAYMENTS
DROP POLICY IF EXISTS "tenant_isolation_payments" ON public.payments;
CREATE POLICY "tenant_isolation_payments"
ON public.payments
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- SHIFTS
DROP POLICY IF EXISTS "tenant_isolation_shifts" ON public.shifts;
CREATE POLICY "tenant_isolation_shifts"
ON public.shifts
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- BOOKINGS
DROP POLICY IF EXISTS "tenant_isolation_bookings" ON public.bookings;
CREATE POLICY "tenant_isolation_bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- RESERVATIONS
DROP POLICY IF EXISTS "tenant_isolation_reservations" ON public.reservations;
CREATE POLICY "tenant_isolation_reservations"
ON public.reservations
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- CONTROLLER_USAGE
DROP POLICY IF EXISTS "tenant_isolation_controller_usage" ON public.controller_usage;
CREATE POLICY "tenant_isolation_controller_usage"
ON public.controller_usage
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- SESSION_DRINKS
DROP POLICY IF EXISTS "tenant_isolation_session_drinks" ON public.session_drinks;
CREATE POLICY "tenant_isolation_session_drinks"
ON public.session_drinks
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- DRINK_SALES
DROP POLICY IF EXISTS "tenant_isolation_drink_sales" ON public.drink_sales;
CREATE POLICY "tenant_isolation_drink_sales"
ON public.drink_sales
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- DRINKS
DROP POLICY IF EXISTS "tenant_isolation_drinks" ON public.drinks;
CREATE POLICY "tenant_isolation_drinks"
ON public.drinks
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- DISCOUNT_PRESETS
DROP POLICY IF EXISTS "tenant_isolation_discount_presets" ON public.discount_presets;
CREATE POLICY "tenant_isolation_discount_presets"
ON public.discount_presets
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- INVENTORY
DROP POLICY IF EXISTS "tenant_isolation_inventory" ON public.inventory;
CREATE POLICY "tenant_isolation_inventory"
ON public.inventory
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- INVENTORY_MOVEMENTS
DROP POLICY IF EXISTS "tenant_isolation_inventory_movements" ON public.inventory_movements;
CREATE POLICY "tenant_isolation_inventory_movements"
ON public.inventory_movements
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- PACKAGE_PRESETS
DROP POLICY IF EXISTS "tenant_isolation_package_presets" ON public.package_presets;
CREATE POLICY "tenant_isolation_package_presets"
ON public.package_presets
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- ADMIN_AUDIT_LOG
DROP POLICY IF EXISTS "tenant_isolation_admin_audit_log" ON public.admin_audit_log;
CREATE POLICY "tenant_isolation_admin_audit_log"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- TENANTS: platform_owner sees all, club users see own tenant only
DROP POLICY IF EXISTS "tenant_isolation_tenants" ON public.tenants;
CREATE POLICY "tenant_isolation_tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (
  id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);
