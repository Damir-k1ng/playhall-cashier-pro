
-- Drop existing restrictive policies and create permissive ones for POS app
-- This is a private internal POS system, so we allow all authenticated and anon access

-- Shifts table
DROP POLICY IF EXISTS "Authenticated users can create shifts" ON public.shifts;
DROP POLICY IF EXISTS "Authenticated users can update shifts" ON public.shifts;
DROP POLICY IF EXISTS "Authenticated users can view shifts" ON public.shifts;

CREATE POLICY "Allow all access to shifts" ON public.shifts FOR ALL USING (true) WITH CHECK (true);

-- Sessions table
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Authenticated users can update sessions" ON public.sessions;
DROP POLICY IF EXISTS "Authenticated users can view sessions" ON public.sessions;

CREATE POLICY "Allow all access to sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);

-- Controller usage table
DROP POLICY IF EXISTS "Authenticated users can create controller usage" ON public.controller_usage;
DROP POLICY IF EXISTS "Authenticated users can update controller usage" ON public.controller_usage;
DROP POLICY IF EXISTS "Authenticated users can view controller usage" ON public.controller_usage;

CREATE POLICY "Allow all access to controller_usage" ON public.controller_usage FOR ALL USING (true) WITH CHECK (true);

-- Session drinks table
DROP POLICY IF EXISTS "Authenticated users can create session drinks" ON public.session_drinks;
DROP POLICY IF EXISTS "Authenticated users can view session drinks" ON public.session_drinks;

CREATE POLICY "Allow all access to session_drinks" ON public.session_drinks FOR ALL USING (true) WITH CHECK (true);

-- Payments table
DROP POLICY IF EXISTS "Authenticated users can create payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;

CREATE POLICY "Allow all access to payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

-- Drink sales table
DROP POLICY IF EXISTS "Authenticated users can create drink sales" ON public.drink_sales;
DROP POLICY IF EXISTS "Authenticated users can view drink sales" ON public.drink_sales;

CREATE POLICY "Allow all access to drink_sales" ON public.drink_sales FOR ALL USING (true) WITH CHECK (true);

-- Reservations table
DROP POLICY IF EXISTS "Authenticated users can create reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can delete reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can view reservations" ON public.reservations;

CREATE POLICY "Allow all access to reservations" ON public.reservations FOR ALL USING (true) WITH CHECK (true);
