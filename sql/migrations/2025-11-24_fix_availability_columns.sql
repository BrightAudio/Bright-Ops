-- Fix employee_availability table - add missing columns
ALTER TABLE employee_availability
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- Add unique constraint for ON CONFLICT
ALTER TABLE employee_availability
DROP CONSTRAINT IF EXISTS employee_availability_employee_id_available_date_key;

ALTER TABLE employee_availability
ADD CONSTRAINT employee_availability_employee_id_available_date_key 
UNIQUE (employee_id, available_date);

-- Verify and fix job_requests if needed
ALTER TABLE job_requests
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

ALTER TABLE job_requests
DROP CONSTRAINT IF EXISTS job_requests_status_check;

ALTER TABLE job_requests
ADD CONSTRAINT job_requests_status_check 
CHECK (status IN ('pending', 'approved', 'denied'));

-- Update RPC functions to work with correct schema
CREATE OR REPLACE FUNCTION set_employee_availability(
  p_employee_id UUID,
  p_date DATE,
  p_available BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Upsert availability
  INSERT INTO employee_availability (employee_id, available_date, is_available)
  VALUES (p_employee_id, p_date, p_available)
  ON CONFLICT (employee_id, available_date)
  DO UPDATE SET 
    is_available = p_available,
    updated_at = NOW();
  
  -- Return the record
  SELECT json_build_object(
    'success', true,
    'employee_id', p_employee_id,
    'date', p_date,
    'is_available', p_available
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_employee_availability(p_employee_id UUID)
RETURNS TABLE (
  id UUID,
  employee_id UUID,
  available_date DATE,
  is_available BOOLEAN,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ea.id,
    ea.employee_id,
    ea.available_date,
    ea.is_available,
    ea.notes
  FROM employee_availability ea
  WHERE ea.employee_id = p_employee_id
  ORDER BY ea.available_date;
END;
$$;

GRANT EXECUTE ON FUNCTION set_employee_availability TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_employee_availability TO authenticated, anon;
