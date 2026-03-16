
-- =============================================
-- WRITE POLICIES (INSERT, UPDATE, DELETE) WITH TENANT ISOLATION
-- Applied to all POS tables with tenant_id
-- =============================================

-- STATIONS
DROP POLICY IF EXISTS "tenant_write_stations" ON public.stations;
CREATE POLICY "tenant_write_stations"
ON public.stations
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- Drop the old SELECT-only policy since FOR ALL covers it
DROP POLICY IF EXISTS "tenant_isolation_stations" ON public.stations;

-- SESSIONS
DROP POLICY IF EXISTS "tenant_isolation_sessions" ON public.sessions;
CREATE POLICY "tenant_write_sessions"
ON public.sessions
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- PAYMENTS
DROP POLICY IF EXISTS "tenant_isolation_payments" ON public.payments;
CREATE POLICY "tenant_write_payments"
ON public.payments
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- SHIFTS
DROP POLICY IF EXISTS "tenant_isolation_shifts" ON public.shifts;
CREATE POLICY "tenant_write_shifts"
ON public.shifts
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- BOOKINGS
DROP POLICY IF EXISTS "tenant_isolation_bookings" ON public.bookings;
CREATE POLICY "tenant_write_bookings"
ON public.bookings
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- RESERVATIONS
DROP POLICY IF EXISTS "tenant_isolation_reservations" ON public.reservations;
CREATE POLICY "tenant_write_reservations"
ON public.reservations
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- CONTROLLER_USAGE
DROP POLICY IF EXISTS "tenant_isolation_controller_usage" ON public.controller_usage;
CREATE POLICY "tenant_write_controller_usage"
ON public.controller_usage
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- SESSION_DRINKS
DROP POLICY IF EXISTS "tenant_isolation_session_drinks" ON public.session_drinks;
CREATE POLICY "tenant_write_session_drinks"
ON public.session_drinks
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- DRINK_SALES
DROP POLICY IF EXISTS "tenant_isolation_drink_sales" ON public.drink_sales;
CREATE POLICY "tenant_write_drink_sales"
ON public.drink_sales
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- DRINKS
DROP POLICY IF EXISTS "tenant_isolation_drinks" ON public.drinks;
CREATE POLICY "tenant_write_drinks"
ON public.drinks
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- DISCOUNT_PRESETS
DROP POLICY IF EXISTS "tenant_isolation_discount_presets" ON public.discount_presets;
CREATE POLICY "tenant_write_discount_presets"
ON public.discount_presets
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- INVENTORY
DROP POLICY IF EXISTS "tenant_isolation_inventory" ON public.inventory;
CREATE POLICY "tenant_write_inventory"
ON public.inventory
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- INVENTORY_MOVEMENTS
DROP POLICY IF EXISTS "tenant_isolation_inventory_movements" ON public.inventory_movements;
CREATE POLICY "tenant_write_inventory_movements"
ON public.inventory_movements
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- PACKAGE_PRESETS
DROP POLICY IF EXISTS "tenant_isolation_package_presets" ON public.package_presets;
CREATE POLICY "tenant_write_package_presets"
ON public.package_presets
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- ADMIN_AUDIT_LOG
DROP POLICY IF EXISTS "tenant_isolation_admin_audit_log" ON public.admin_audit_log;
CREATE POLICY "tenant_write_admin_audit_log"
ON public.admin_audit_log
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- USERS: tenant members can modify users in their tenant, platform_owner can modify all
DROP POLICY IF EXISTS "tenant_users_read" ON public.users;
CREATE POLICY "tenant_write_users"
ON public.users
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);

-- TENANTS: platform_owner can modify all, club users can read own only
DROP POLICY IF EXISTS "tenant_isolation_tenants" ON public.tenants;
CREATE POLICY "tenant_write_tenants"
ON public.tenants
FOR ALL
TO authenticated
USING (
  id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  id = public.get_user_tenant_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
);
