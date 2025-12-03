-- Rename existing role column to job_title (it contains job descriptions)
ALTER TABLE employees
RENAME COLUMN role TO job_title;

-- Add new role column for manager/crew designation
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'crew' CHECK (role IN ('manager', 'crew'));

-- Set all existing employees to 'crew' by default
UPDATE employees
SET role = 'crew'
WHERE role IS NULL;

-- Create job_requests table for crew to request assignment to jobs
CREATE TABLE IF NOT EXISTS public.job_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  requested_role TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by UUID REFERENCES public.employees(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, employee_id)
);

-- Create employee_availability table for crew to mark available dates
CREATE TABLE IF NOT EXISTS public.employee_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  available_date DATE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, available_date)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_job_requests_job_id ON public.job_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_employee_id ON public.job_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_status ON public.job_requests(status);
CREATE INDEX IF NOT EXISTS idx_employee_availability_employee_id ON public.employee_availability(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_availability_date ON public.employee_availability(available_date);

-- Enable RLS
ALTER TABLE public.job_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_availability ENABLE ROW LEVEL SECURITY;

-- Create policies (drop if exists first)
DROP POLICY IF EXISTS "Allow all operations for authenticated users on job_requests" ON public.job_requests;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on employee_availability" ON public.employee_availability;

CREATE POLICY "Allow all operations for authenticated users on job_requests"
  ON public.job_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on employee_availability"
  ON public.employee_availability
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON COLUMN employees.role IS 'Employee role: manager or crew';
COMMENT ON TABLE job_requests IS 'Requests from crew to be assigned to jobs';
COMMENT ON TABLE employee_availability IS 'Employee availability calendar';
