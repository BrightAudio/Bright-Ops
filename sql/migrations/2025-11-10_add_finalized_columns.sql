-- Add finalized_by and finalized_at columns to pull_sheets table
-- Run this in Supabase SQL Editor

ALTER TABLE public.pull_sheets
  ADD COLUMN IF NOT EXISTS finalized_by TEXT,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pull_sheets_finalized_at ON public.pull_sheets(finalized_at);
CREATE INDEX IF NOT EXISTS idx_pull_sheets_status ON public.pull_sheets(status);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pull_sheets'
  AND column_name IN ('finalized_by', 'finalized_at');
