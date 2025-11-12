-- Add missing fields to jobs table for the enhanced UI
-- Run this in Supabase SQL Editor

-- Add date fields (start_at, end_at)
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;

-- Add venue and notes fields
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS venue TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add financial fields (income, labor_cost, profit)
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS income DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(10, 2) DEFAULT 0;

-- Add computed profit column (income - labor_cost)
-- Drop first if exists to avoid conflicts
ALTER TABLE jobs DROP COLUMN IF EXISTS profit;
ALTER TABLE jobs 
ADD COLUMN profit DECIMAL(10, 2) GENERATED ALWAYS AS (COALESCE(income, 0) - COALESCE(labor_cost, 0)) STORED;

-- Add client_id reference (if clients table exists)
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add missing fields to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_start_at ON public.jobs(start_at);
CREATE INDEX IF NOT EXISTS idx_jobs_end_at ON public.jobs(end_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON public.jobs(client_id);

-- Add comments for documentation
COMMENT ON COLUMN jobs.start_at IS 'Job/event start date and time';
COMMENT ON COLUMN jobs.end_at IS 'Job/event end date and time';
COMMENT ON COLUMN jobs.venue IS 'Event venue location';
COMMENT ON COLUMN jobs.notes IS 'General notes about the job';
COMMENT ON COLUMN jobs.income IS 'Total income/revenue for the job';
COMMENT ON COLUMN jobs.labor_cost IS 'Total labor cost for the job';
COMMENT ON COLUMN jobs.profit IS 'Calculated profit (income - labor_cost)';
COMMENT ON COLUMN jobs.client_id IS 'Reference to the client for this job';

COMMENT ON COLUMN clients.email IS 'Client email address';
COMMENT ON COLUMN clients.phone IS 'Client phone number';
