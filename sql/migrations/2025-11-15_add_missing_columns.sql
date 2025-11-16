-- Add missing columns to leads table

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS venue TEXT;

-- Verify columns were added
SELECT column_name FROM information_schema.columns WHERE table_name='leads';
