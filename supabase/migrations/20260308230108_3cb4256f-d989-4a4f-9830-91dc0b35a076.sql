
-- Add tenant_id to cashiers table
ALTER TABLE public.cashiers 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Backfill existing cashiers with default tenant
UPDATE public.cashiers 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Make tenant_id NOT NULL after backfill
ALTER TABLE public.cashiers 
ALTER COLUMN tenant_id SET NOT NULL;

-- Add unique constraint for PIN within tenant
ALTER TABLE public.cashiers
ADD CONSTRAINT unique_cashier_pin_per_tenant UNIQUE (tenant_id, pin);

-- Add unique constraint for (id, tenant_id) for compound FK references
ALTER TABLE public.cashiers
ADD CONSTRAINT unique_cashier_id_tenant UNIQUE (id, tenant_id);
