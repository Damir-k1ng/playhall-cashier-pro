
CREATE OR REPLACE FUNCTION public.increment_shift_totals(
  p_shift_id uuid,
  p_cash integer DEFAULT 0,
  p_kaspi integer DEFAULT 0,
  p_games integer DEFAULT 0,
  p_controllers integer DEFAULT 0,
  p_drinks integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.shifts
  SET
    total_cash = total_cash + p_cash,
    total_kaspi = total_kaspi + p_kaspi,
    total_games = total_games + p_games,
    total_controllers = total_controllers + p_controllers,
    total_drinks = total_drinks + p_drinks
  WHERE id = p_shift_id;
END;
$$;
