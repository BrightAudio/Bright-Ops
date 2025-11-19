-- Check RLS policies for pull_sheet_scans table
-- Run this in Supabase SQL Editor to verify permissions

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'pull_sheet_scans';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'pull_sheet_scans';

-- If no policies exist or RLS is blocking, run this to allow access:
-- ALTER TABLE public.pull_sheet_scans ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Enable read access for all users" ON public.pull_sheet_scans
--   FOR SELECT USING (true);
-- 
-- CREATE POLICY "Enable insert access for all users" ON public.pull_sheet_scans
--   FOR INSERT WITH CHECK (true);
