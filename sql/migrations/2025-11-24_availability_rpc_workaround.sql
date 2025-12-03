-- Create RPC function to set availability (bypasses REST API cache)
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

-- Create RPC function to get availability
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION set_employee_availability TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_employee_availability TO authenticated, anon;
