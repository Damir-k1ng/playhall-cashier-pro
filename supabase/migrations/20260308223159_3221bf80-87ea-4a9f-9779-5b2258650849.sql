-- =====================================================
-- 1. Upgrade all tenant FK constraints to ON DELETE CASCADE
-- =====================================================

ALTER TABLE public.stations DROP CONSTRAINT stations_tenant_id_fkey;
ALTER TABLE public.stations ADD CONSTRAINT stations_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.shifts DROP CONSTRAINT shifts_tenant_id_fkey;
ALTER TABLE public.shifts ADD CONSTRAINT shifts_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.sessions DROP CONSTRAINT sessions_tenant_id_fkey;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.payments DROP CONSTRAINT payments_tenant_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.controller_usage DROP CONSTRAINT controller_usage_tenant_id_fkey;
ALTER TABLE public.controller_usage ADD CONSTRAINT controller_usage_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.session_drinks DROP CONSTRAINT session_drinks_tenant_id_fkey;
ALTER TABLE public.session_drinks ADD CONSTRAINT session_drinks_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.drink_sales DROP CONSTRAINT drink_sales_tenant_id_fkey;
ALTER TABLE public.drink_sales ADD CONSTRAINT drink_sales_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.drinks DROP CONSTRAINT drinks_tenant_id_fkey;
ALTER TABLE public.drinks ADD CONSTRAINT drinks_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.inventory DROP CONSTRAINT inventory_tenant_id_fkey;
ALTER TABLE public.inventory ADD CONSTRAINT inventory_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_movements DROP CONSTRAINT inventory_movements_tenant_id_fkey;
ALTER TABLE public.inventory_movements ADD CONSTRAINT inventory_movements_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.reservations DROP CONSTRAINT reservations_tenant_id_fkey;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.bookings DROP CONSTRAINT bookings_tenant_id_fkey;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.discount_presets DROP CONSTRAINT discount_presets_tenant_id_fkey;
ALTER TABLE public.discount_presets ADD CONSTRAINT discount_presets_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_tenant_id_fkey;
ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- =====================================================
-- 2. Composite unique constraints for cross-tenant consistency
-- =====================================================

ALTER TABLE public.stations ADD CONSTRAINT unique_station_tenant UNIQUE (id, tenant_id);
ALTER TABLE public.shifts ADD CONSTRAINT unique_shift_tenant UNIQUE (id, tenant_id);
ALTER TABLE public.sessions ADD CONSTRAINT unique_session_tenant UNIQUE (id, tenant_id);
ALTER TABLE public.drinks ADD CONSTRAINT unique_drink_tenant UNIQUE (id, tenant_id);

-- =====================================================
-- 3. Compound foreign keys ensuring same-tenant consistency
-- =====================================================

-- sessions → stations (same tenant)
ALTER TABLE public.sessions DROP CONSTRAINT sessions_station_id_fkey;
ALTER TABLE public.sessions ADD CONSTRAINT fk_sessions_station_tenant
  FOREIGN KEY (station_id, tenant_id) REFERENCES public.stations(id, tenant_id);

-- sessions → shifts (same tenant)
ALTER TABLE public.sessions DROP CONSTRAINT sessions_shift_id_fkey;
ALTER TABLE public.sessions ADD CONSTRAINT fk_sessions_shift_tenant
  FOREIGN KEY (shift_id, tenant_id) REFERENCES public.shifts(id, tenant_id);

-- payments → sessions (same tenant)
ALTER TABLE public.payments DROP CONSTRAINT payments_session_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT fk_payments_session_tenant
  FOREIGN KEY (session_id, tenant_id) REFERENCES public.sessions(id, tenant_id);

-- payments → shifts (same tenant)
ALTER TABLE public.payments DROP CONSTRAINT payments_shift_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT fk_payments_shift_tenant
  FOREIGN KEY (shift_id, tenant_id) REFERENCES public.shifts(id, tenant_id);

-- controller_usage → sessions (same tenant)
ALTER TABLE public.controller_usage DROP CONSTRAINT controller_usage_session_id_fkey;
ALTER TABLE public.controller_usage ADD CONSTRAINT fk_controller_usage_session_tenant
  FOREIGN KEY (session_id, tenant_id) REFERENCES public.sessions(id, tenant_id);

-- session_drinks → sessions (same tenant)
ALTER TABLE public.session_drinks DROP CONSTRAINT session_drinks_session_id_fkey;
ALTER TABLE public.session_drinks ADD CONSTRAINT fk_session_drinks_session_tenant
  FOREIGN KEY (session_id, tenant_id) REFERENCES public.sessions(id, tenant_id);

-- session_drinks → drinks (same tenant)
ALTER TABLE public.session_drinks DROP CONSTRAINT session_drinks_drink_id_fkey;
ALTER TABLE public.session_drinks ADD CONSTRAINT fk_session_drinks_drink_tenant
  FOREIGN KEY (drink_id, tenant_id) REFERENCES public.drinks(id, tenant_id);

-- drink_sales → drinks (same tenant)
ALTER TABLE public.drink_sales DROP CONSTRAINT drink_sales_drink_id_fkey;
ALTER TABLE public.drink_sales ADD CONSTRAINT fk_drink_sales_drink_tenant
  FOREIGN KEY (drink_id, tenant_id) REFERENCES public.drinks(id, tenant_id);

-- drink_sales → shifts (same tenant)
ALTER TABLE public.drink_sales DROP CONSTRAINT drink_sales_shift_id_fkey;
ALTER TABLE public.drink_sales ADD CONSTRAINT fk_drink_sales_shift_tenant
  FOREIGN KEY (shift_id, tenant_id) REFERENCES public.shifts(id, tenant_id);

-- reservations → stations (same tenant)
ALTER TABLE public.reservations DROP CONSTRAINT reservations_station_id_fkey;
ALTER TABLE public.reservations ADD CONSTRAINT fk_reservations_station_tenant
  FOREIGN KEY (station_id, tenant_id) REFERENCES public.stations(id, tenant_id);

-- reservations → shifts (same tenant)
ALTER TABLE public.reservations DROP CONSTRAINT reservations_shift_id_fkey;
ALTER TABLE public.reservations ADD CONSTRAINT fk_reservations_shift_tenant
  FOREIGN KEY (shift_id, tenant_id) REFERENCES public.shifts(id, tenant_id);

-- bookings → stations (same tenant)
ALTER TABLE public.bookings DROP CONSTRAINT bookings_station_id_fkey;
ALTER TABLE public.bookings ADD CONSTRAINT fk_bookings_station_tenant
  FOREIGN KEY (station_id, tenant_id) REFERENCES public.stations(id, tenant_id);

-- inventory → drinks (same tenant)
ALTER TABLE public.inventory DROP CONSTRAINT inventory_drink_id_fkey;
ALTER TABLE public.inventory ADD CONSTRAINT fk_inventory_drink_tenant
  FOREIGN KEY (drink_id, tenant_id) REFERENCES public.drinks(id, tenant_id);

-- inventory_movements → drinks (same tenant)
ALTER TABLE public.inventory_movements DROP CONSTRAINT inventory_movements_drink_id_fkey;
ALTER TABLE public.inventory_movements ADD CONSTRAINT fk_inventory_movements_drink_tenant
  FOREIGN KEY (drink_id, tenant_id) REFERENCES public.drinks(id, tenant_id);

-- inventory_movements → shifts (same tenant)
ALTER TABLE public.inventory_movements DROP CONSTRAINT inventory_movements_shift_id_fkey;
ALTER TABLE public.inventory_movements ADD CONSTRAINT fk_inventory_movements_shift_tenant
  FOREIGN KEY (shift_id, tenant_id) REFERENCES public.shifts(id, tenant_id);

-- admin_audit_log → shifts (same tenant)
ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_shift_id_fkey;
ALTER TABLE public.admin_audit_log ADD CONSTRAINT fk_admin_audit_log_shift_tenant
  FOREIGN KEY (shift_id, tenant_id) REFERENCES public.shifts(id, tenant_id);