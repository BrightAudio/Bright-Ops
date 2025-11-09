-- Function to calculate labor cost for a job
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION calculate_job_labor_cost(job_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_cost DECIMAL := 0;
BEGIN
  -- Sum up all labor costs for this job
  SELECT COALESCE(SUM(rate_amount), 0) INTO total_cost
  FROM job_assignments
  WHERE job_id = job_uuid
    AND rate_amount IS NOT NULL;
  
  RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update labor_cost when assignments change
CREATE OR REPLACE FUNCTION update_job_labor_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the labor_cost for the affected job
  UPDATE jobs 
  SET labor_cost = calculate_job_labor_cost(
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.job_id
      ELSE NEW.job_id
    END
  )
  WHERE id = CASE 
    WHEN TG_OP = 'DELETE' THEN OLD.job_id
    ELSE NEW.job_id
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on job_assignments
DROP TRIGGER IF EXISTS update_labor_cost_on_insert ON job_assignments;
CREATE TRIGGER update_labor_cost_on_insert
  AFTER INSERT ON job_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_job_labor_cost();

DROP TRIGGER IF EXISTS update_labor_cost_on_update ON job_assignments;
CREATE TRIGGER update_labor_cost_on_update
  AFTER UPDATE ON job_assignments
  FOR EACH ROW
  WHEN (OLD.rate_amount IS DISTINCT FROM NEW.rate_amount)
  EXECUTE FUNCTION update_job_labor_cost();

DROP TRIGGER IF EXISTS update_labor_cost_on_delete ON job_assignments;
CREATE TRIGGER update_labor_cost_on_delete
  AFTER DELETE ON job_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_job_labor_cost();
