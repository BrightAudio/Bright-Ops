-- Add rate fields to job_assignments table
-- Run this in Supabase SQL Editor

ALTER TABLE job_assignments 
ADD COLUMN IF NOT EXISTS rate_type TEXT CHECK (rate_type IN ('day', 'hourly')),
ADD COLUMN IF NOT EXISTS rate_amount DECIMAL(10, 2);

COMMENT ON COLUMN job_assignments.rate_type IS 'Type of rate: day or hourly';
COMMENT ON COLUMN job_assignments.rate_amount IS 'The rate amount in dollars';
