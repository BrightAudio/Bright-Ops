-- ============================================
-- WAREHOUSE LOCATION ASSOCIATIONS FOR CREW/EMPLOYEES
-- Add warehouse_id to employees and job_assignments tables
-- Enforce RLS policies for multi-tenant crew management
-- ============================================

-- STEP 1: Add warehouse_id to employees table
-- ============================================

ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_warehouse ON public.employees(warehouse_id);

COMMENT ON COLUMN public.employees.warehouse_id IS 'Primary warehouse location for this employee. Employees are only visible to users with warehouse access.';

-- Migrate existing employees to default warehouse (NEW SOUND)
DO $$
DECLARE
  v_warehouse_id UUID;
BEGIN
  SELECT id INTO v_warehouse_id 
  FROM public.warehouses 
  WHERE LOWER(name) LIKE '%new sound%' 
  LIMIT 1;
  
  IF v_warehouse_id IS NOT NULL THEN
    UPDATE public.employees 
    SET warehouse_id = v_warehouse_id 
    WHERE warehouse_id IS NULL;
    
    RAISE NOTICE 'Migrated existing employees to NEW SOUND Warehouse';
  END IF;
END $$;


-- STEP 2: Update RLS policies for employees
-- ============================================

-- Drop existing wide-open policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on employees" ON public.employees;

-- Users can only view employees from accessible warehouses
CREATE POLICY "Users can view employees from accessible warehouses"
  ON public.employees
  FOR SELECT
  USING (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only create employees in warehouses they have access to
CREATE POLICY "Users can insert employees to accessible warehouses"
  ON public.employees
  FOR INSERT
  WITH CHECK (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only update employees from warehouses they have access to
CREATE POLICY "Users can update employees from accessible warehouses"
  ON public.employees
  FOR UPDATE
  USING (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only delete employees from warehouses they have access to
CREATE POLICY "Users can delete employees from accessible warehouses"
  ON public.employees
  FOR DELETE
  USING (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );


-- STEP 3: Update RLS policies for job_assignments
-- ============================================

-- Job assignments inherit warehouse from the job
-- Drop existing wide-open policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users on job_assignments" ON public.job_assignments;

-- Users can only view job assignments for jobs in their accessible warehouses
CREATE POLICY "Users can view job assignments from accessible warehouses"
  ON public.job_assignments
  FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM public.jobs 
      WHERE warehouse_id IS NULL 
      OR warehouse_id IN (
        SELECT warehouse_id 
        FROM public.user_warehouse_access 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can only create job assignments for jobs in accessible warehouses
CREATE POLICY "Users can insert job assignments to accessible warehouses"
  ON public.job_assignments
  FOR INSERT
  WITH CHECK (
    job_id IN (
      SELECT id FROM public.jobs 
      WHERE warehouse_id IS NULL 
      OR warehouse_id IN (
        SELECT warehouse_id 
        FROM public.user_warehouse_access 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can only update job assignments for jobs in accessible warehouses
CREATE POLICY "Users can update job assignments from accessible warehouses"
  ON public.job_assignments
  FOR UPDATE
  USING (
    job_id IN (
      SELECT id FROM public.jobs 
      WHERE warehouse_id IS NULL 
      OR warehouse_id IN (
        SELECT warehouse_id 
        FROM public.user_warehouse_access 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can only delete job assignments for jobs in accessible warehouses
CREATE POLICY "Users can delete job assignments from accessible warehouses"
  ON public.job_assignments
  FOR DELETE
  USING (
    job_id IN (
      SELECT id FROM public.jobs 
      WHERE warehouse_id IS NULL 
      OR warehouse_id IN (
        SELECT warehouse_id 
        FROM public.user_warehouse_access 
        WHERE user_id = auth.uid()
      )
    )
  );


-- STEP 4: Add validation to ensure crew assignments match job warehouse
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_job_assignment_warehouse()
RETURNS TRIGGER AS $$
DECLARE
  v_job_warehouse_id UUID;
  v_employee_warehouse_id UUID;
BEGIN
  -- Get job's warehouse
  SELECT warehouse_id INTO v_job_warehouse_id
  FROM public.jobs
  WHERE id = NEW.job_id;
  
  -- Get employee's warehouse
  SELECT warehouse_id INTO v_employee_warehouse_id
  FROM public.employees
  WHERE id = NEW.employee_id;
  
  -- Allow if both are NULL (legacy data)
  IF v_job_warehouse_id IS NULL AND v_employee_warehouse_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Require match if both have warehouses
  IF v_job_warehouse_id IS NOT NULL AND v_employee_warehouse_id IS NOT NULL THEN
    IF v_job_warehouse_id != v_employee_warehouse_id THEN
      RAISE EXCEPTION 'Cannot assign crew from warehouse % to job in warehouse %', 
        v_employee_warehouse_id, v_job_warehouse_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS validate_job_assignment_warehouse_trigger ON public.job_assignments;
CREATE TRIGGER validate_job_assignment_warehouse_trigger
  BEFORE INSERT OR UPDATE ON public.job_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_job_assignment_warehouse();

COMMENT ON FUNCTION public.validate_job_assignment_warehouse IS 'Ensures crew assignments only use employees from the same warehouse as the job';


-- STEP 5: Verification queries
-- ============================================

-- Verify employees have warehouse assignments
-- SELECT id, name, warehouse_id FROM public.employees LIMIT 10;

-- Verify job assignments respect warehouse boundaries
-- SELECT 
--   ja.id,
--   e.name as employee_name,
--   e.warehouse_id as employee_warehouse,
--   j.code as job_code,
--   j.warehouse_id as job_warehouse
-- FROM public.job_assignments ja
-- JOIN public.employees e ON ja.employee_id = e.id
-- JOIN public.jobs j ON ja.job_id = j.id
-- LIMIT 10;
