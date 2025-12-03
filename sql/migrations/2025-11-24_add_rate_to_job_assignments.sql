-- Add rate fields to job_assignments table

-- First, drop any existing constraint if it exists
ALTER TABLE job_assignments
DROP CONSTRAINT IF EXISTS job_assignments_rate_type_check;

-- Add the columns without constraints first
ALTER TABLE job_assignments
ADD COLUMN IF NOT EXISTS rate_type TEXT,
ADD COLUMN IF NOT EXISTS rate_amount DECIMAL(10, 2);

-- Now add the constraint with the correct check
ALTER TABLE job_assignments
ADD CONSTRAINT job_assignments_rate_type_check 
CHECK (rate_type IS NULL OR rate_type IN ('hourly', 'daily'));

-- Add comment for documentation
COMMENT ON COLUMN job_assignments.rate_type IS 'Type of rate: hourly or daily';
COMMENT ON COLUMN job_assignments.rate_amount IS 'Rate amount in dollars';
