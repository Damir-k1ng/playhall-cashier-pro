-- Create a platform_owner user for Super Admin testing
INSERT INTO public.users (name, email, role, pin_code, tenant_id)
VALUES ('Super Admin', 'superadmin@lave.kz', 'platform_owner', '9999', NULL);