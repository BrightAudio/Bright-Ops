-- Create fleet/vehicles table for transport management
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.fleet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT, -- e.g., "Truck", "Van", "Trailer"
  license_plate TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Maintenance', 'Retired')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_fleet_status ON public.fleet(status);
CREATE INDEX IF NOT EXISTS idx_fleet_name ON public.fleet(name);

-- Enable RLS (Row Level Security)
ALTER TABLE public.fleet ENABLE ROW LEVEL SECURITY;

-- Create policy: allow all authenticated users to view and manage fleet
CREATE POLICY "Authenticated users can view fleet"
  ON public.fleet
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage fleet"
  ON public.fleet
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fleet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_fleet_timestamp
  BEFORE UPDATE ON public.fleet
  FOR EACH ROW
  EXECUTE FUNCTION update_fleet_updated_at();

COMMENT ON TABLE public.fleet IS 'Company vehicles available for transports';
COMMENT ON COLUMN public.fleet.type IS 'Type of vehicle: Truck, Van, Trailer, etc.';
COMMENT ON COLUMN public.fleet.status IS 'Current status: Active, Maintenance, Retired';

-- Insert some sample vehicles
INSERT INTO public.fleet (name, type, license_plate, status, notes) VALUES
  ('Box Truck #1', 'Box Truck', 'ABC-1234', 'Active', '26ft box truck'),
  ('Sprinter Van', 'Van', 'XYZ-5678', 'Active', 'Mercedes Sprinter'),
  ('Flatbed Trailer', 'Trailer', 'TRL-9012', 'Active', '16ft flatbed')
ON CONFLICT DO NOTHING;
