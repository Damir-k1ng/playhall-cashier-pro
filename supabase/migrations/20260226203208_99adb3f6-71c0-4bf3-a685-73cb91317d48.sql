
CREATE OR REPLACE FUNCTION public.auto_create_inventory_on_drink_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.inventory (drink_id, quantity, unit, min_threshold)
  VALUES (NEW.id, 0, 'piece', 0)
  ON CONFLICT (drink_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_inventory_on_drink
  AFTER INSERT ON public.drinks
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_inventory_on_drink_insert();
