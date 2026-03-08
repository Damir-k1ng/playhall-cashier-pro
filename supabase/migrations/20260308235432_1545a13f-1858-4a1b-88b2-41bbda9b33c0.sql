-- Update inventory triggers to include tenant_id
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_session_drink()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Decrease inventory
  UPDATE public.inventory
  SET quantity = quantity - NEW.quantity,
      updated_at = now()
  WHERE drink_id = NEW.drink_id AND tenant_id = NEW.tenant_id;

  -- Log movement
  INSERT INTO public.inventory_movements (drink_id, quantity_change, type, reference_id, tenant_id)
  VALUES (NEW.drink_id, -NEW.quantity, 'sale', NEW.id, NEW.tenant_id);

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.deduct_inventory_on_drink_sale()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.inventory
  SET quantity = quantity - NEW.quantity,
      updated_at = now()
  WHERE drink_id = NEW.drink_id AND tenant_id = NEW.tenant_id;

  INSERT INTO public.inventory_movements (drink_id, quantity_change, type, shift_id, reference_id, tenant_id)
  VALUES (NEW.drink_id, -NEW.quantity, 'sale', NEW.shift_id, NEW.id, NEW.tenant_id);

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_inventory_on_session_drink_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.inventory
  SET quantity = quantity + OLD.quantity,
      updated_at = now()
  WHERE drink_id = OLD.drink_id AND tenant_id = OLD.tenant_id;

  INSERT INTO public.inventory_movements (drink_id, quantity_change, type, reason, reference_id, tenant_id)
  VALUES (OLD.drink_id, OLD.quantity, 'correction', 'Удаление напитка из сессии', OLD.id, OLD.tenant_id);

  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_create_inventory_on_drink_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.inventory (drink_id, quantity, unit, min_threshold, tenant_id)
  VALUES (NEW.id, 0, 'piece', 0, NEW.tenant_id);
  RETURN NEW;
END;
$function$;

-- Update foreign keys to point to users table instead of cashiers
ALTER TABLE public.shifts DROP CONSTRAINT IF EXISTS shifts_cashier_id_fkey;
ALTER TABLE public.shifts ADD CONSTRAINT shifts_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.users(id);

ALTER TABLE public.admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_admin_id_fkey;
ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id);

ALTER TABLE public.inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_performed_by_fkey;
ALTER TABLE public.inventory_movements ADD CONSTRAINT inventory_movements_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_cashier_id_fkey;
-- Since cashier_id is deprecated in favor of user_id, we can just leave user_id referencing auth.users or public.users.
-- Wait, we need to ensure user_roles points to public.users or just drop the table later if role is on users.
-- For now, let's point cashier_id to users(id) just in case.
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.users(id);

-- Wait, what if cashiers has data that users doesn't? 
-- Let's copy cashiers to users first if they don't exist.
INSERT INTO public.users (id, name, pin_code, max_discount_percent, tenant_id, role)
SELECT id, name, pin, max_discount_percent, tenant_id, 'cashier'
FROM public.cashiers
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  pin_code = EXCLUDED.pin_code,
  max_discount_percent = EXCLUDED.max_discount_percent,
  tenant_id = EXCLUDED.tenant_id,
  role = 'cashier';

-- Now it's safe to drop the cashiers table
DROP TABLE IF EXISTS public.cashiers CASCADE;