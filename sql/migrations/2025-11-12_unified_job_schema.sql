-- Unified migration to add all necessary job fields
-- This consolidates all job-related migrations
-- Run this in Supabase SQL Editor

-- Add all date fields to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;

-- Add venue and notes fields
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS venue TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add financial fields
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS income DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(10, 2) DEFAULT 0;

-- Add computed profit column
ALTER TABLE jobs DROP COLUMN IF EXISTS profit;
ALTER TABLE jobs 
ADD COLUMN profit DECIMAL(10, 2) GENERATED ALWAYS AS (COALESCE(income, 0) - COALESCE(labor_cost, 0)) STORED;

-- Add client reference
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add client contact fields
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_start_at ON jobs(start_at);
CREATE INDEX IF NOT EXISTS idx_jobs_end_at ON jobs(end_at);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);

-- Add comments
COMMENT ON COLUMN jobs.start_at IS 'Job start date/time';
COMMENT ON COLUMN jobs.end_at IS 'Job end date/time (return/completion)';
COMMENT ON COLUMN jobs.venue IS 'Venue or location name';
COMMENT ON COLUMN jobs.notes IS 'Additional job notes';
COMMENT ON COLUMN jobs.income IS 'Total job income/revenue';
COMMENT ON COLUMN jobs.labor_cost IS 'Total labor cost for the job';
COMMENT ON COLUMN jobs.profit IS 'Computed profit (income - labor_cost)';
COMMENT ON COLUMN jobs.client_id IS 'Reference to the client';
COMMENT ON COLUMN clients.email IS 'Client email address';
COMMENT ON COLUMN clients.phone IS 'Client phone number';
