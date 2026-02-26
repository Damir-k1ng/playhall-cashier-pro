
-- Re-create triggers that may be missing

-- Drop if exists first to be safe
DROP TRIGGER IF EXISTS trg_deduct_inventory_session_drink ON public.session_drinks;
DROP TRIGGER IF EXISTS trg_deduct_inventory_drink_sale ON public.drink_sales;
DROP TRIGGER IF EXISTS trg_restore_inventory_session_drink_delete ON public.session_drinks;

CREATE TRIGGER trg_deduct_inventory_session_drink
  AFTER INSERT ON public.session_drinks
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_inventory_on_session_drink();

CREATE TRIGGER trg_deduct_inventory_drink_sale
  AFTER INSERT ON public.drink_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_inventory_on_drink_sale();

CREATE TRIGGER trg_restore_inventory_session_drink_delete
  AFTER DELETE ON public.session_drinks
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_inventory_on_session_drink_delete();
