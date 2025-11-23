-- Add employee availability table
CREATE TABLE IF NOT EXISTS employee_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add volunteer requests tracking to job_assignments
ALTER TABLE job_assignments 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'pending', 'approved', 'rejected'));

ALTER TABLE job_assignments
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;

ALTER TABLE job_assignments
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES employees(id);

ALTER TABLE job_assignments
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employee_availability_employee ON employee_availability(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_availability_date ON employee_availability(available_date);
CREATE INDEX IF NOT EXISTS idx_job_assignments_status ON job_assignments(status);
CREATE INDEX IF NOT EXISTS idx_job_assignments_employee ON job_assignments(employee_id);

-- Comments
COMMENT ON TABLE employee_availability IS 'Tracks when employees are available to work';
COMMENT ON COLUMN job_assignments.status IS 'assigned=manager assigned, pending=employee volunteered awaiting approval, approved=volunteer approved, rejected=volunteer rejected';
