-- Add client venues relationship and venue details to jobs
-- Run this in Supabase SQL Editor

-- Create client_venues junction table to track which venues belong to which clients
CREATE TABLE IF NOT EXISTS public.client_venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, venue_id)
);

-- Add venue_id foreign key to jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_venues_client_id ON public.client_venues(client_id);
CREATE INDEX IF NOT EXISTS idx_client_venues_venue_id ON public.client_venues(venue_id);
CREATE INDEX IF NOT EXISTS idx_jobs_venue_id ON public.jobs(venue_id);

-- Add RLS policies for client_venues
ALTER TABLE public.client_venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON public.client_venues
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.client_venues
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.client_venues
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.client_venues
  FOR DELETE USING (auth.role() = 'authenticated');

-- Verify the changes
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('client_venues', 'jobs')
  AND column_name IN ('client_id', 'venue_id', 'is_primary')
ORDER BY table_name, ordinal_position;
