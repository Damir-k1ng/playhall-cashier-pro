
-- Drop existing public RLS policies and create secure ones
-- Cashiers will authenticate via PIN through Edge Function

-- Drop existing policies
DROP POLICY IF EXISTS "Cashiers are publicly readable" ON public.cashiers;
DROP POLICY IF EXISTS "Allow all access to shifts" ON public.shifts;
DROP POLICY IF EXISTS "Allow all access to sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow all access to payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all access to controller_usage" ON public.controller_usage;
DROP POLICY IF EXISTS "Allow all access to session_drinks" ON public.session_drinks;
DROP POLICY IF EXISTS "Allow all access to drink_sales" ON public.drink_sales;
DROP POLICY IF EXISTS "Allow all access to reservations" ON public.reservations;
DROP POLICY IF EXISTS "Allow all access to bookings" ON public.bookings;

-- Create service role only policies for sensitive tables
-- These will be accessed through Edge Functions with service role

-- Cashiers: only readable via Edge Function (service role)
CREATE POLICY "Service role only for cashiers"
ON public.cashiers FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Shifts: service role access
CREATE POLICY "Service role access for shifts"
ON public.shifts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Sessions: service role access
CREATE POLICY "Service role access for sessions"
ON public.sessions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Payments: service role access
CREATE POLICY "Service role access for payments"
ON public.payments FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Controller usage: service role access
CREATE POLICY "Service role access for controller_usage"
ON public.controller_usage FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Session drinks: service role access
CREATE POLICY "Service role access for session_drinks"
ON public.session_drinks FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Drink sales: service role access
CREATE POLICY "Service role access for drink_sales"
ON public.drink_sales FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Reservations: service role access
CREATE POLICY "Service role access for reservations"
ON public.reservations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Bookings: service role access
CREATE POLICY "Service role access for bookings"
ON public.bookings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add session_token column to shifts for API authentication
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS session_token TEXT UNIQUE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_shifts_session_token ON public.shifts(session_token) WHERE session_token IS NOT NULL;
