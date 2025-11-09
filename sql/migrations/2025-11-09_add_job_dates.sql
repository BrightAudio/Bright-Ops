-- Add event dates to jobs table for schedule tracking
-- Run this in Supabase SQL Editor

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS load_in_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS load_out_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS prep_start_date TIMESTAMPTZ;

-- Create indexes for efficient date queries
CREATE INDEX IF NOT EXISTS idx_jobs_event_date ON public.jobs(event_date);
CREATE INDEX IF NOT EXISTS idx_jobs_load_in_date ON public.jobs(load_in_date);
CREATE INDEX IF NOT EXISTS idx_jobs_load_out_date ON public.jobs(load_out_date);

-- Comments for documentation
COMMENT ON COLUMN jobs.event_date IS 'Main event date for the job';
COMMENT ON COLUMN jobs.load_in_date IS 'Date to load equipment in';
COMMENT ON COLUMN jobs.load_out_date IS 'Date to load equipment out (completion/teardown)';
COMMENT ON COLUMN jobs.prep_start_date IS 'Date preparation work should begin';
