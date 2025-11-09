-- Fix pull_sheets table permissions
-- Run this in Supabase SQL Editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view pull sheets" ON pull_sheets;
DROP POLICY IF EXISTS "Users can create pull sheets" ON pull_sheets;
DROP POLICY IF EXISTS "Users can update pull sheets" ON pull_sheets;
DROP POLICY IF EXISTS "Users can delete pull sheets" ON pull_sheets;

-- Enable RLS
ALTER TABLE pull_sheets ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all pull sheets
CREATE POLICY "Users can view pull sheets"
ON pull_sheets FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to create pull sheets
CREATE POLICY "Users can create pull sheets"
ON pull_sheets FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update pull sheets
CREATE POLICY "Users can update pull sheets"
ON pull_sheets FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete pull sheets
CREATE POLICY "Users can delete pull sheets"
ON pull_sheets FOR DELETE
TO authenticated
USING (true);
