-- Create booking status enum
CREATE TYPE public.booking_status AS ENUM ('booked', 'cancelled', 'completed');

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME NOT NULL,
  comment TEXT,
  status public.booking_status NOT NULL DEFAULT 'booked',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index to ensure only one active booking per station per day
CREATE UNIQUE INDEX idx_one_active_booking_per_station 
ON public.bookings (station_id, booking_date) 
WHERE status = 'booked';

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Allow all access (cashier system)
CREATE POLICY "Allow all access to bookings" 
ON public.bookings 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;