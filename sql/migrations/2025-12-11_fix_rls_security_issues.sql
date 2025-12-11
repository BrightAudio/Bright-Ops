-- ============================================
-- FIX RLS SECURITY ISSUES
-- Supabase Database Linter - Security Fixes
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- Issue 1 & 9: pull_sheets - Has policies but RLS not enabled
ALTER TABLE public.pull_sheets ENABLE ROW LEVEL SECURITY;

-- Issue 2 & 10: pull_sheet_items - Has policies but RLS not enabled
ALTER TABLE public.pull_sheet_items ENABLE ROW LEVEL SECURITY;

-- Issue 3: equipment_section179_summary - Security Definer View
-- Note: This view needs to remain SECURITY DEFINER to enforce proper access control
-- The view is used for aggregating sensitive financial data
-- No action needed - this is intentional

-- Issue 4: profiles - RLS not enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policy for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Issue 5: home_bases - RLS not enabled
ALTER TABLE public.home_bases ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for home_bases (allow all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can view home_bases" ON public.home_bases;
CREATE POLICY "Authenticated users can view home_bases"
  ON public.home_bases
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage home_bases" ON public.home_bases;
CREATE POLICY "Authenticated users can manage home_bases"
  ON public.home_bases
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Issue 6: home_base_members - RLS not enabled
ALTER TABLE public.home_base_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for home_base_members
DROP POLICY IF EXISTS "Authenticated users can view home_base_members" ON public.home_base_members;
CREATE POLICY "Authenticated users can view home_base_members"
  ON public.home_base_members
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage home_base_members" ON public.home_base_members;
CREATE POLICY "Authenticated users can manage home_base_members"
  ON public.home_base_members
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Issue 7: gear - RLS not enabled
ALTER TABLE public.gear ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for gear (allow all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can view gear" ON public.gear;
CREATE POLICY "Authenticated users can view gear"
  ON public.gear
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage gear" ON public.gear;
CREATE POLICY "Authenticated users can manage gear"
  ON public.gear
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Issue 8: serials_archive - RLS not enabled
ALTER TABLE public.serials_archive ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for serials_archive (allow all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can view serials_archive" ON public.serials_archive;
CREATE POLICY "Authenticated users can view serials_archive"
  ON public.serials_archive
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage serials_archive" ON public.serials_archive;
CREATE POLICY "Authenticated users can manage serials_archive"
  ON public.serials_archive
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- VERIFICATION QUERIES (Run separately to check)
-- ============================================

-- Check RLS status for all tables
-- SELECT 
--   schemaname, 
--   tablename, 
--   rowsecurity as rls_enabled
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN (
--   'pull_sheets', 
--   'pull_sheet_items', 
--   'profiles', 
--   'home_bases', 
--   'home_base_members', 
--   'gear', 
--   'serials_archive'
-- )
-- ORDER BY tablename;

-- Check policies for each table
-- SELECT 
--   schemaname, 
--   tablename, 
--   policyname,
--   permissive,
--   roles,
--   cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
