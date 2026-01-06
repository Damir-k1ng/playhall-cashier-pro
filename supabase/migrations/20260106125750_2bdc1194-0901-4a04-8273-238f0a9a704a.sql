
-- Add RLS policies for anon role to allow read/write operations
-- These are needed because we're using PIN authentication, not Supabase Auth

-- Stations: allow anon to read (already read-only table)
CREATE POLICY "Anon can read stations"
ON public.stations FOR SELECT
TO anon
USING (true);

-- Drinks: allow anon to read
CREATE POLICY "Anon can read drinks"
ON public.drinks FOR SELECT
TO anon
USING (true);

-- Sessions: allow anon full access
CREATE POLICY "Anon can manage sessions"
ON public.sessions FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Shifts: allow anon full access
CREATE POLICY "Anon can manage shifts"
ON public.shifts FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Payments: allow anon full access
CREATE POLICY "Anon can manage payments"
ON public.payments FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Controller usage: allow anon full access
CREATE POLICY "Anon can manage controller_usage"
ON public.controller_usage FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Session drinks: allow anon full access
CREATE POLICY "Anon can manage session_drinks"
ON public.session_drinks FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Drink sales: allow anon full access
CREATE POLICY "Anon can manage drink_sales"
ON public.drink_sales FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Reservations: allow anon full access
CREATE POLICY "Anon can manage reservations"
ON public.reservations FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Bookings: allow anon full access
CREATE POLICY "Anon can manage bookings"
ON public.bookings FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Cashiers: allow anon to read for PIN validation
CREATE POLICY "Anon can read cashiers"
ON public.cashiers FOR SELECT
TO anon
USING (true);
