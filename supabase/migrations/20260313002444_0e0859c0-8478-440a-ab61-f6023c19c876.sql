
-- 1. Drop global UNIQUE constraint on station_number
ALTER TABLE public.stations DROP CONSTRAINT stations_station_number_key;

-- 2. Drop restrictive CHECK (1-8 limit doesn't scale for multi-tenant)
ALTER TABLE public.stations DROP CONSTRAINT stations_station_number_check;

-- 3. Add composite UNIQUE constraint (tenant_id, station_number)
ALTER TABLE public.stations ADD CONSTRAINT stations_tenant_station_number_unique UNIQUE (tenant_id, station_number);

-- 4. Add a reasonable CHECK (positive station numbers)
ALTER TABLE public.stations ADD CONSTRAINT stations_station_number_positive CHECK (station_number >= 1);
