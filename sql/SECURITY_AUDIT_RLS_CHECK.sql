-- RLS Audit Script for Bright Audio
-- Run this in Supabase SQL Editor to get current RLS status
-- Copy the entire script and paste into Supabase Console

-- ============================================
-- STEP 1: List all public tables and RLS status
-- ============================================
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- STEP 2: List all RLS policies by table
-- ============================================
SELECT 
  tablename,
  policyname,
  permissive,
  roles::TEXT,
  cmd,
  COALESCE(qual::TEXT, 'N/A') as select_condition,
  COALESCE(with_check::TEXT, 'N/A') as check_condition
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- STEP 3: Find tables with RLS DISABLED
-- ============================================
SELECT 
  tablename,
  'RLS IS DISABLED - NEEDS FIX' as status,
  n_live_tup as row_count
FROM pg_tables 
WHERE schemaname = 'public' AND NOT rowsecurity
ORDER BY tablename;

-- ============================================
-- STEP 4: Find tables with NO policies
-- (indicates RLS enabled but policies may be missing)
-- ============================================
SELECT 
  t.tablename,
  'RLS ENABLED BUT NO POLICIES' as status,
  n_live_tup as row_count
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public' AND t.rowsecurity AND p.policyname IS NULL
GROUP BY t.tablename, t.relname
ORDER BY t.tablename;

-- ============================================
-- STEP 5: Tables with overly-permissive policies
-- (Allow all, no conditions)
-- ============================================
SELECT 
  tablename,
  policyname,
  'OVERLY PERMISSIVE' as status,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND (qual IS NULL AND with_check IS NULL)
  AND policyname LIKE '%allow%all%'
ORDER BY tablename;

-- ============================================
-- STEP 6: Summary Report
-- ============================================
WITH table_rls AS (
  SELECT 
    tablename,
    rowsecurity,
    n_live_tup as row_count
  FROM pg_tables 
  WHERE schemaname = 'public'
),
rls_with_policies AS (
  SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public'
)
SELECT 
  'Total Tables' as metric,
  COUNT(DISTINCT tablename)::TEXT as value
FROM table_rls
UNION ALL
SELECT 
  'Tables with RLS ENABLED',
  COUNT(DISTINCT tablename)::TEXT
FROM table_rls
WHERE rowsecurity
UNION ALL
SELECT 
  'Tables with RLS DISABLED',
  COUNT(DISTINCT tablename)::TEXT
FROM table_rls
WHERE NOT rowsecurity
UNION ALL
SELECT 
  'Tables with Policies',
  COUNT(DISTINCT tablename)::TEXT
FROM rls_with_policies
UNION ALL
SELECT 
  'Tables with NO Policies (RLS but no rules)',
  COUNT(DISTINCT t.tablename)::TEXT
FROM table_rls t
LEFT JOIN rls_with_policies p ON p.tablename = t.tablename
WHERE t.rowsecurity AND p.tablename IS NULL;

-- ============================================
-- STEP 7: Detailed table breakdown
-- ============================================
SELECT 
  t.tablename,
  CASE WHEN t.rowsecurity THEN 'YES' ELSE 'NO' END as rls_enabled,
  COUNT(DISTINCT p.policyname)::TEXT as num_policies,
  t.n_live_tup::TEXT as row_count
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity, t.relname
ORDER BY t.tablename;
