-- Fix RLS policies for training_assignments table
-- This allows managers to view all assignments and users to view their own

-- Check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'training_assignments';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'training_assignments';

-- Drop existing policies if any
DROP POLICY IF EXISTS "Managers can view all training assignments" ON public.training_assignments;
DROP POLICY IF EXISTS "Users can view own training assignments" ON public.training_assignments;
DROP POLICY IF EXISTS "Managers can insert training assignments" ON public.training_assignments;
DROP POLICY IF EXISTS "Managers can update training assignments" ON public.training_assignments;
DROP POLICY IF EXISTS "Users can update own training assignments" ON public.training_assignments;

-- Create policy for managers to view all assignments
CREATE POLICY "Managers can view all training assignments"
ON public.training_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'manager'
  )
);

-- Create policy for users to view their own assignments
CREATE POLICY "Users can view own training assignments"
ON public.training_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create policy for managers to insert assignments
CREATE POLICY "Managers can insert training assignments"
ON public.training_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'manager'
  )
);

-- Create policy for managers to update any assignments
CREATE POLICY "Managers can update training assignments"
ON public.training_assignments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'manager'
  )
);

-- Create policy for users to update their own assignments (progress tracking)
CREATE POLICY "Users can update own training assignments"
ON public.training_assignments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Enable RLS
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;

-- Verification queries
SELECT 'RLS Status' as check_type, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'training_assignments';

SELECT 'Policies' as check_type, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'training_assignments';

-- Test query (should work for managers)
SELECT COUNT(*) as total_assignments
FROM public.training_assignments;
