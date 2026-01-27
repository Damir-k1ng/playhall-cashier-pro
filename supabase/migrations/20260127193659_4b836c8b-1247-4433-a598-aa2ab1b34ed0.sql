-- Make user_id nullable and remove FK constraint for PIN-based auth
ALTER TABLE public.user_roles ALTER COLUMN user_id DROP NOT NULL;

-- Drop the foreign key constraint on user_id
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Now insert admin role for the new cashier
INSERT INTO public.user_roles (user_id, cashier_id, role) 
VALUES (NULL, 'dfb09726-fa46-4751-851c-e39b7fb6b3da', 'admin');