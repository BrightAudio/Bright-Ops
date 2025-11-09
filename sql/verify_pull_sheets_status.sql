-- Quick verification query to check pull sheets setup status
-- Copy and paste this into Supabase SQL Editor to see current state

SELECT 
  '=== PULL SHEETS TABLE ===' as info,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pull_sheets'
  ) as table_exists,
  (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'pull_sheets'
  ) as column_count,
  (
    SELECT array_agg(column_name::text ORDER BY ordinal_position) 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'pull_sheets'
  ) as columns,
  (
    SELECT COUNT(*) FROM public.pull_sheets
  ) as row_count,
  (
    SELECT relrowsecurity 
    FROM pg_class 
    WHERE oid = 'public.pull_sheets'::regclass
  ) as rls_enabled

UNION ALL

SELECT 
  '=== PULL SHEET ITEMS TABLE ===' as info,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pull_sheet_items'
  ) as table_exists,
  (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'pull_sheet_items'
  ) as column_count,
  (
    SELECT array_agg(column_name::text ORDER BY ordinal_position) 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'pull_sheet_items'
  ) as columns,
  (
    SELECT COUNT(*) FROM public.pull_sheet_items
  ) as row_count,
  (
    SELECT relrowsecurity 
    FROM pg_class 
    WHERE oid = 'public.pull_sheet_items'::regclass
  ) as rls_enabled

UNION ALL

SELECT 
  '=== FOREIGN KEY CONSTRAINTS ===' as info,
  EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pull_sheets_job_id_fkey'
  ) as job_link_exists,
  EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pull_sheet_items_pull_sheet_id_fkey'
  ) as items_link_exists,
  (
    SELECT string_agg(conname, ', ' ORDER BY conname) 
    FROM pg_constraint 
    WHERE conrelid IN ('public.pull_sheets'::regclass, 'public.pull_sheet_items'::regclass)
    AND contype = 'f'
  ) as all_foreign_keys,
  NULL as row_count,
  NULL as rls_enabled

UNION ALL

SELECT 
  '=== PERMISSIONS ===' as info,
  EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public' 
    AND table_name = 'pull_sheets'
    AND grantee = 'authenticated'
    AND privilege_type = 'SELECT'
  ) as authenticated_has_access,
  (
    SELECT COUNT(DISTINCT privilege_type)
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' 
    AND table_name = 'pull_sheets'
    AND grantee = 'authenticated'
  ) as authenticated_privilege_count,
  (
    SELECT string_agg(DISTINCT privilege_type, ', ' ORDER BY privilege_type)
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' 
    AND table_name = 'pull_sheets'
    AND grantee = 'authenticated'
  ) as authenticated_privileges,
  NULL as row_count,
  NULL as rls_enabled;

-- Also check for any pull sheets linked to jobs
SELECT 
  '=== PULL SHEETS LINKED TO JOBS ===' as summary,
  COUNT(*) as total_pull_sheets,
  COUNT(job_id) as linked_to_jobs,
  COUNT(*) - COUNT(job_id) as standalone_pull_sheets
FROM public.pull_sheets;

-- Show recent pull sheets with their jobs
SELECT 
  ps.code,
  ps.name,
  ps.status,
  j.code as job_code,
  j.title as job_title,
  ps.created_at
FROM public.pull_sheets ps
LEFT JOIN public.jobs j ON ps.job_id = j.id
ORDER BY ps.created_at DESC
LIMIT 10;
