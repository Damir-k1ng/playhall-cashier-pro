-- Remove dangerous anonymous RLS policies that bypass Edge Function authentication

-- Drop anon policies that expose sensitive data
DROP POLICY IF EXISTS "Anon can read cashiers" ON cashiers;
DROP POLICY IF EXISTS "Anon can manage shifts" ON shifts;
DROP POLICY IF EXISTS "Anon can manage sessions" ON sessions;
DROP POLICY IF EXISTS "Anon can manage payments" ON payments;
DROP POLICY IF EXISTS "Anon can manage controller_usage" ON controller_usage;
DROP POLICY IF EXISTS "Anon can manage session_drinks" ON session_drinks;
DROP POLICY IF EXISTS "Anon can manage drink_sales" ON drink_sales;
DROP POLICY IF EXISTS "Anon can manage reservations" ON reservations;
DROP POLICY IF EXISTS "Anon can manage bookings" ON bookings;

-- Add database constraints to prevent negative amounts and ensure data integrity
DO $$ 
BEGIN
  -- Payments constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_positive_amounts') THEN
    ALTER TABLE payments ADD CONSTRAINT payments_positive_amounts
    CHECK (cash_amount >= 0 AND kaspi_amount >= 0 AND total_amount >= 0);
  END IF;
  
  -- Sessions constraints  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_positive_costs') THEN
    ALTER TABLE sessions ADD CONSTRAINT sessions_positive_costs
    CHECK (game_cost >= 0 AND controller_cost >= 0 AND drink_cost >= 0 AND total_cost >= 0);
  END IF;
  
  -- Session drinks constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drinks_positive_values') THEN
    ALTER TABLE session_drinks ADD CONSTRAINT drinks_positive_values
    CHECK (quantity > 0 AND total_price >= 0);
  END IF;
  
  -- Drink sales constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drink_sales_positive_values') THEN
    ALTER TABLE drink_sales ADD CONSTRAINT drink_sales_positive_values
    CHECK (quantity > 0 AND total_price >= 0 AND cash_amount >= 0 AND kaspi_amount >= 0);
  END IF;
END $$;