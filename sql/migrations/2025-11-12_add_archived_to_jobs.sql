-- Add archived column to jobs table for archive functionality
-- This allows completed jobs to be moved to an archive view without deletion

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false NOT NULL;

-- Create index for filtering archived jobs
CREATE INDEX IF NOT EXISTS idx_jobs_archived ON public.jobs(archived);

-- Add comment explaining the column
COMMENT ON COLUMN public.jobs.archived IS 'When true, job is moved to archive view (hidden from main list by default)';
