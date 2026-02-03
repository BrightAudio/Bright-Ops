-- ============================================
-- TASK ASSIGNMENT SYSTEM
-- Enables task assignment to employees with notifications
-- ============================================

-- Add columns to tasks table for assignment tracking
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create task_assignments junction table for tracking multiple assignments
CREATE TABLE IF NOT EXISTS public.task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, employee_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_employee ON public.task_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_status ON public.task_assignments(status);
CREATE INDEX IF NOT EXISTS idx_task_assignments_pending ON public.task_assignments(employee_id, status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_assignments
DROP POLICY IF EXISTS "Users can view task assignments for their organization" ON public.task_assignments;
CREATE POLICY "Users can view task assignments for their organization"
  ON public.task_assignments
  FOR SELECT
  USING (assigned_by = auth.uid());

DROP POLICY IF EXISTS "Users can create task assignments" ON public.task_assignments;
CREATE POLICY "Users can create task assignments"
  ON public.task_assignments
  FOR INSERT
  WITH CHECK (assigned_by = auth.uid());

DROP POLICY IF EXISTS "Employees can acknowledge their assignments" ON public.task_assignments;
CREATE POLICY "Employees can acknowledge their assignments"
  ON public.task_assignments
  FOR UPDATE
  USING (true);

-- Tasks RLS handled by existing policies - no changes needed for task assignment system

-- Trigger function to create notification when task is assigned
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
  task_title TEXT;
  assigned_user_name TEXT;
  employee_name TEXT;
BEGIN
  -- Get task title
  SELECT title INTO task_title FROM public.tasks WHERE id = NEW.task_id;
  
  -- Get assigned by user name
  SELECT email INTO assigned_user_name FROM auth.users WHERE id = NEW.assigned_by;
  
  -- Get employee name
  SELECT name INTO employee_name FROM public.employees WHERE id = NEW.employee_id;

  -- Create notification for the assigned employee
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    link,
    created_at
  ) VALUES (
    NEW.employee_id,
    'task_assignment',
    'New Task Assigned: ' || COALESCE(task_title, 'Untitled Task'),
    'You have been assigned task: ' || COALESCE(task_title, 'Untitled Task'),
    '/app/dashboard?tab=tasks',
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_task_assignment ON public.task_assignments;

-- Create trigger for notifications
CREATE TRIGGER on_task_assignment
AFTER INSERT ON public.task_assignments
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_assignment();

-- Trigger function to update updated_at
CREATE OR REPLACE FUNCTION public.update_task_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_task_assignments_updated_at ON public.task_assignments;

CREATE TRIGGER update_task_assignments_updated_at
BEFORE UPDATE ON public.task_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_task_assignments_updated_at();

-- Convenience function to assign task to employee
CREATE OR REPLACE FUNCTION public.assign_task_to_employee(
  p_task_id UUID,
  p_employee_id UUID,
  p_assigned_by UUID
)
RETURNS TABLE (
  assignment_id UUID,
  task_id UUID,
  employee_id UUID,
  status TEXT
) AS $$
BEGIN
  INSERT INTO public.task_assignments (
    task_id,
    employee_id,
    assigned_by,
    status
  ) VALUES (
    p_task_id,
    p_employee_id,
    p_assigned_by,
    'pending'
  )
  ON CONFLICT (task_id, employee_id) DO UPDATE
  SET
    assigned_by = p_assigned_by,
    assigned_at = now(),
    status = 'pending'
  RETURNING
    task_assignments.id,
    task_assignments.task_id,
    task_assignments.employee_id,
    task_assignments.status;
END;
$$ LANGUAGE plpgsql;

-- Function to get assigned tasks for an employee
CREATE OR REPLACE FUNCTION public.get_employee_tasks(
  p_employee_id UUID
)
RETURNS TABLE (
  task_id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  due_date TIMESTAMPTZ,
  assignment_status TEXT,
  created_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ,
  assigned_by_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.description,
    t.status,
    t.due_date,
    ta.status,
    t.created_at,
    ta.assigned_at,
    u.email
  FROM public.tasks t
  INNER JOIN public.task_assignments ta ON t.id = ta.task_id
  LEFT JOIN auth.users u ON ta.assigned_by = u.id
  WHERE ta.employee_id = p_employee_id
  ORDER BY ta.assigned_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get task assignments for a task
CREATE OR REPLACE FUNCTION public.get_task_assignments(
  p_task_id UUID
)
RETURNS TABLE (
  assignment_id UUID,
  employee_id UUID,
  employee_name TEXT,
  status TEXT,
  assigned_at TIMESTAMPTZ,
  assigned_by_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ta.id,
    ta.employee_id,
    e.name,
    ta.status,
    ta.assigned_at,
    u.email
  FROM public.task_assignments ta
  LEFT JOIN public.employees e ON ta.employee_id = e.id
  LEFT JOIN auth.users u ON ta.assigned_by = u.id
  WHERE ta.task_id = p_task_id
  ORDER BY ta.assigned_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to acknowledge task assignment
CREATE OR REPLACE FUNCTION public.acknowledge_task_assignment(
  p_assignment_id UUID
)
RETURNS TABLE (
  assignment_id UUID,
  status TEXT,
  acknowledged_at TIMESTAMPTZ
) AS $$
BEGIN
  UPDATE public.task_assignments
  SET
    status = 'acknowledged',
    acknowledged_at = now(),
    updated_at = now()
  WHERE id = p_assignment_id
  RETURNING
    task_assignments.id,
    task_assignments.status,
    task_assignments.acknowledged_at;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.task_assignments IS 'Tracks assignments of tasks to employees with status tracking';
COMMENT ON FUNCTION public.assign_task_to_employee(UUID, UUID, UUID) IS 'Assigns a task to an employee and triggers notification';
COMMENT ON FUNCTION public.get_employee_tasks(UUID) IS 'Retrieves all tasks assigned to a specific employee';
COMMENT ON FUNCTION public.get_task_assignments(UUID) IS 'Retrieves all assignments for a specific task';
COMMENT ON FUNCTION public.acknowledge_task_assignment(UUID) IS 'Marks a task assignment as acknowledged by the employee';
