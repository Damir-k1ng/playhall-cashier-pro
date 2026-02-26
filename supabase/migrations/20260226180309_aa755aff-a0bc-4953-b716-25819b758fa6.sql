
-- Enum for inventory unit type
CREATE TYPE public.inventory_unit AS ENUM ('piece', 'liter');

-- Enum for movement type
CREATE TYPE public.inventory_movement_type AS ENUM ('intake', 'sale', 'write_off', 'correction');

-- Current stock levels
CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drink_id uuid REFERENCES public.drinks(id) ON DELETE CASCADE NOT NULL UNIQUE,
  quantity numeric(10,2) NOT NULL DEFAULT 0,
  unit inventory_unit NOT NULL DEFAULT 'piece',
  min_threshold numeric(10,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access for inventory"
  ON public.inventory FOR ALL
  USING (true)
  WITH CHECK (true);

-- Movement log (full audit trail)
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drink_id uuid REFERENCES public.drinks(id) ON DELETE CASCADE NOT NULL,
  quantity_change numeric(10,2) NOT NULL,
  type inventory_movement_type NOT NULL,
  reason text,
  performed_by uuid REFERENCES public.cashiers(id),
  shift_id uuid REFERENCES public.shifts(id),
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access for inventory_movements"
  ON public.inventory_movements FOR ALL
  USING (true)
  WITH CHECK (true);

-- Initialize inventory rows for all existing drinks
INSERT INTO public.inventory (drink_id, quantity, unit, min_threshold)
SELECT id, 0, 'piece', 5
FROM public.drinks
ON CONFLICT (drink_id) DO NOTHING;

-- Function to auto-deduct inventory on session_drinks insert
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_session_drink()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Decrease inventory
  UPDATE public.inventory
  SET quantity = quantity - NEW.quantity,
      updated_at = now()
  WHERE drink_id = NEW.drink_id;

  -- Log movement
  INSERT INTO public.inventory_movements (drink_id, quantity_change, type, reference_id)
  VALUES (NEW.drink_id, -NEW.quantity, 'sale', NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deduct_inventory_session_drink
  AFTER INSERT ON public.session_drinks
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_inventory_on_session_drink();

-- Function to auto-deduct inventory on drink_sales insert
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_drink_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.inventory
  SET quantity = quantity - NEW.quantity,
      updated_at = now()
  WHERE drink_id = NEW.drink_id;

  INSERT INTO public.inventory_movements (drink_id, quantity_change, type, shift_id, reference_id)
  VALUES (NEW.drink_id, -NEW.quantity, 'sale', NEW.shift_id, NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deduct_inventory_drink_sale
  AFTER INSERT ON public.drink_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_inventory_on_drink_sale();

-- Function to restore inventory when session_drink is deleted
CREATE OR REPLACE FUNCTION public.restore_inventory_on_session_drink_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.inventory
  SET quantity = quantity + OLD.quantity,
      updated_at = now()
  WHERE drink_id = OLD.drink_id;

  INSERT INTO public.inventory_movements (drink_id, quantity_change, type, reason, reference_id)
  VALUES (OLD.drink_id, OLD.quantity, 'correction', 'Удаление напитка из сессии', OLD.id);

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_restore_inventory_session_drink_delete
  AFTER DELETE ON public.session_drinks
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_inventory_on_session_drink_delete();
