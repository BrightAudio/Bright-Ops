-- Create tasks table for task management
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  due_date TIMESTAMPTZ,
  assignees TEXT, -- Comma-separated list of names or JSON array
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- Enable RLS (Row Level Security)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policy: users can only see and manage their own tasks
CREATE POLICY "Users can view their own tasks" ON public.tasks 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON public.tasks 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON public.tasks 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON public.tasks 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.tasks IS 'User tasks and to-do items';
COMMENT ON COLUMN public.tasks.status IS 'Task status: pending, in_progress, or completed';
COMMENT ON COLUMN public.tasks.due_date IS 'When the task is due';
COMMENT ON COLUMN public.tasks.assignees IS 'People assigned to the task';
