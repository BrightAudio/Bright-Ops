-- ============================================
-- ADD ESTIMATED HOURS TO JOB ASSIGNMENTS
-- Run this in Supabase SQL Editor
-- ============================================

-- Add estimated_hours column to job_assignments table
ALTER TABLE job_assignments 
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2);

-- Comment explaining the column
COMMENT ON COLUMN job_assignments.estimated_hours IS 'Estimated hours for hourly rate crew members. Used to calculate total labor cost.';
