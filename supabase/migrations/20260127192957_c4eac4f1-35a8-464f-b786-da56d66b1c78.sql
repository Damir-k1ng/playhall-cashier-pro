-- Add unique constraint on PIN to prevent duplicate cashier PINs
ALTER TABLE public.cashiers ADD CONSTRAINT cashiers_pin_unique UNIQUE (pin);