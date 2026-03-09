-- Test tenant creation (simulating API call)
-- Step 1: Create tenant
INSERT INTO public.tenants (club_name, city, signup_email, status, plan, trial_until)
VALUES ('Test Club Astana', 'Astana', 'testclub@lave.kz', 'trial', 'trial', NOW() + INTERVAL '14 days')
RETURNING *;