-- Add warehouse/location column to jobs table
-- This allows tracking which warehouse each job is associated with

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS warehouse TEXT DEFAULT 'NEW SOUND Warehouse';

-- Add comment to explain the column
COMMENT ON COLUMN jobs.warehouse IS 'Warehouse location where job was created/managed (e.g., NEW SOUND Warehouse, Bright Audio Warehouse)';

-- Create index for faster filtering by warehouse
CREATE INDEX IF NOT EXISTS idx_jobs_warehouse ON jobs(warehouse);

-- Update existing jobs to have a warehouse (defaults to NEW SOUND Warehouse)
UPDATE jobs SET warehouse = 'NEW SOUND Warehouse' WHERE warehouse IS NULL;
