
-- Trigger: auto-deduct inventory when a drink is added to a session
CREATE TRIGGER trg_deduct_inventory_on_session_drink
  AFTER INSERT ON public.session_drinks
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_inventory_on_session_drink();

-- Trigger: auto-deduct inventory when a standalone drink sale is created
CREATE TRIGGER trg_deduct_inventory_on_drink_sale
  AFTER INSERT ON public.drink_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_inventory_on_drink_sale();

-- Trigger: restore inventory when a drink is removed from a session
CREATE TRIGGER trg_restore_inventory_on_session_drink_delete
  AFTER DELETE ON public.session_drinks
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_inventory_on_session_drink_delete();
