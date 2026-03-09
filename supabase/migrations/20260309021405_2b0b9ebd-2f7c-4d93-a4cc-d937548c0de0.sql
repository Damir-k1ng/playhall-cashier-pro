-- Step 2: Create default club_admin user for the new tenant
INSERT INTO public.users (tenant_id, name, email, pin_code, role)
VALUES ('9fa34097-3cea-4069-a427-83d006633311', 'Admin Test Club Astana', 'testclub@lave.kz', '0000', 'club_admin')
RETURNING *;