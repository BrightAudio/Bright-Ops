-- Create gear, jobs, and job_gear tables with amortization tracking
-- Run this in Supabase SQL Editor

-- Note: jobs table already exists, we'll add missing columns
-- Note: inventory_items table already exists with amortization_per_job

-- Add total_amortization column to jobs table if it doesn't exist
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS total_amortization DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN jobs.total_amortization IS 'Total amortization cost for all equipment used on this job';

-- Create job_gear junction table to track equipment used on each job
CREATE TABLE IF NOT EXISTS job_gear (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  gear_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  amortization_each DECIMAL(10, 4) NOT NULL,  -- Snapshot of amortization_per_job at time of job
  amortization_total DECIMAL(10, 2) NOT NULL, -- quantity × amortization_each
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT job_gear_quantity_positive CHECK (quantity > 0),
  CONSTRAINT job_gear_unique_item_per_job UNIQUE (job_id, gear_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_gear_job_id ON job_gear(job_id);
CREATE INDEX IF NOT EXISTS idx_job_gear_gear_id ON job_gear(gear_id);
CREATE INDEX IF NOT EXISTS idx_job_gear_created_at ON job_gear(created_at DESC);

-- Add comments
COMMENT ON TABLE job_gear IS 'Tracks equipment used on each job with amortization snapshots';
COMMENT ON COLUMN job_gear.job_id IS 'Reference to the job';
COMMENT ON COLUMN job_gear.gear_id IS 'Reference to the equipment item from inventory_items table';
COMMENT ON COLUMN job_gear.quantity IS 'Number of units used on this job';
COMMENT ON COLUMN job_gear.amortization_each IS 'Amortization per job at the time this job was created (snapshot for historical accuracy)';
COMMENT ON COLUMN job_gear.amortization_total IS 'Total amortization for this equipment on this job (quantity × amortization_each)';

-- Create function to automatically calculate amortization_total
CREATE OR REPLACE FUNCTION calculate_job_gear_amortization()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-calculate amortization_total from quantity and amortization_each
  NEW.amortization_total := ROUND(NEW.quantity * NEW.amortization_each, 2);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate amortization_total on insert/update
DROP TRIGGER IF EXISTS trg_calculate_job_gear_amortization ON job_gear;
CREATE TRIGGER trg_calculate_job_gear_amortization
  BEFORE INSERT OR UPDATE OF quantity, amortization_each
  ON job_gear
  FOR EACH ROW
  EXECUTE FUNCTION calculate_job_gear_amortization();

-- Create function to update job total_amortization when job_gear changes
CREATE OR REPLACE FUNCTION update_job_total_amortization()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate total amortization for the job
  UPDATE jobs
  SET total_amortization = (
    SELECT COALESCE(SUM(amortization_total), 0)
    FROM job_gear
    WHERE job_id = COALESCE(NEW.job_id, OLD.job_id)
  )
  WHERE id = COALESCE(NEW.job_id, OLD.job_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update job total_amortization
DROP TRIGGER IF EXISTS trg_update_job_total_amortization ON job_gear;
CREATE TRIGGER trg_update_job_total_amortization
  AFTER INSERT OR UPDATE OR DELETE
  ON job_gear
  FOR EACH ROW
  EXECUTE FUNCTION update_job_total_amortization();

-- Enable Row Level Security
ALTER TABLE job_gear ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for job_gear
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow all access to job_gear" ON job_gear;
  
  -- Create new policy
  CREATE POLICY "Allow all access to job_gear"
  ON job_gear
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
END $$;

-- Grant permissions
GRANT ALL ON job_gear TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
