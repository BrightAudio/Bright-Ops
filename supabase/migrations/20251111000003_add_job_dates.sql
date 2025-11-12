-- Add date fields to jobs table for proper calendar scheduling
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS load_in_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS load_out_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS prep_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expected_return_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS venue TEXT,
ADD COLUMN IF NOT EXISTS assigned_crew TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add indexes for date queries
CREATE INDEX IF NOT EXISTS idx_jobs_event_date ON public.jobs(event_date);
CREATE INDEX IF NOT EXISTS idx_jobs_start_date ON public.jobs(start_date);
CREATE INDEX IF NOT EXISTS idx_jobs_expected_return_date ON public.jobs(expected_return_date);

-- Add comments
COMMENT ON COLUMN public.jobs.event_date IS 'Main event/show date';
COMMENT ON COLUMN public.jobs.start_date IS 'When the gig starts (may include setup)';
COMMENT ON COLUMN public.jobs.end_date IS 'When the gig ends';
COMMENT ON COLUMN public.jobs.load_in_date IS 'Equipment load-in date/time';
COMMENT ON COLUMN public.jobs.load_out_date IS 'Equipment load-out date/time';
COMMENT ON COLUMN public.jobs.prep_start_date IS 'Preparation start date';
COMMENT ON COLUMN public.jobs.expected_return_date IS 'When equipment/crew expected back';
COMMENT ON COLUMN public.jobs.venue IS 'Venue/location name';
COMMENT ON COLUMN public.jobs.assigned_crew IS 'Array of crew member IDs assigned to this job';
COMMENT ON COLUMN public.jobs.notes IS 'Additional job notes';
