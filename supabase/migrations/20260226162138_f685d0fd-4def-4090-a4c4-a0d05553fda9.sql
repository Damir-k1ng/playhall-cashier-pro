
-- Add max_discount_percent to cashiers table
ALTER TABLE public.cashiers ADD COLUMN max_discount_percent integer NOT NULL DEFAULT 0;

-- Create discount_presets table for admin-defined preset buttons
CREATE TABLE public.discount_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  percent integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT discount_presets_percent_check CHECK (percent >= 0 AND percent <= 100),
  CONSTRAINT discount_presets_percent_unique UNIQUE (percent)
);

-- Add discount fields to payments table
ALTER TABLE public.payments ADD COLUMN discount_percent integer NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN discount_amount integer NOT NULL DEFAULT 0;

-- RLS for discount_presets (service role only, same pattern as other tables)
ALTER TABLE public.discount_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access for discount_presets"
  ON public.discount_presets
  FOR ALL
  USING (true)
  WITH CHECK (true);
