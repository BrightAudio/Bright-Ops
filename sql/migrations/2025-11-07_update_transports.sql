-- Update transports table to include vehicle, driver, times, and notes fields
-- These fields are used by the transport creation UI

ALTER TABLE public.transports 
  ADD COLUMN IF NOT EXISTS vehicle TEXT,
  ADD COLUMN IF NOT EXISTS driver TEXT,
  ADD COLUMN IF NOT EXISTS depart_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arrive_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.transports.vehicle IS 'Vehicle identifier (e.g., Truck 1, Van)';
COMMENT ON COLUMN public.transports.driver IS 'Driver name';
COMMENT ON COLUMN public.transports.depart_at IS 'Scheduled departure time';
COMMENT ON COLUMN public.transports.arrive_at IS 'Scheduled arrival time';
COMMENT ON COLUMN public.transports.notes IS 'Additional transport notes';
