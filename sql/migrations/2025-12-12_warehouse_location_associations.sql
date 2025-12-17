-- ============================================
-- WAREHOUSE LOCATION ASSOCIATIONS
-- Add warehouse_id to jobs, pullsheets, and clients
-- All data becomes location-specific with RLS enforcement
-- ============================================

-- STEP 1: Add warehouse_id to jobs table
-- ============================================

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_warehouse ON public.jobs(warehouse_id);

COMMENT ON COLUMN public.jobs.warehouse_id IS 'Warehouse location this job is associated with. Jobs are only visible to users with warehouse access.';

-- Migrate existing jobs to default warehouse (NEW SOUND)
DO $$
DECLARE
  v_warehouse_id UUID;
BEGIN
  SELECT id INTO v_warehouse_id 
  FROM public.warehouses 
  WHERE LOWER(name) LIKE '%new sound%' 
  LIMIT 1;
  
  IF v_warehouse_id IS NOT NULL THEN
    UPDATE public.jobs 
    SET warehouse_id = v_warehouse_id 
    WHERE warehouse_id IS NULL;
    
    RAISE NOTICE 'Migrated existing jobs to NEW SOUND Warehouse';
  END IF;
END $$;


-- STEP 2: Add warehouse_id to pull_sheets table
-- ============================================

ALTER TABLE public.pull_sheets 
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pull_sheets_warehouse ON public.pull_sheets(warehouse_id);

COMMENT ON COLUMN public.pull_sheets.warehouse_id IS 'Warehouse location this pullsheet is associated with. Only visible to users with warehouse access.';

-- Migrate existing pullsheets to match their job's warehouse
DO $$
BEGIN
  UPDATE public.pull_sheets ps
  SET warehouse_id = j.warehouse_id
  FROM public.jobs j
  WHERE ps.job_id = j.id 
    AND ps.warehouse_id IS NULL
    AND j.warehouse_id IS NOT NULL;
  
  RAISE NOTICE 'Migrated existing pullsheets to match job warehouses';
END $$;


-- STEP 3: Add warehouse_id to clients table
-- ============================================

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_warehouse ON public.clients(warehouse_id);

COMMENT ON COLUMN public.clients.warehouse_id IS 'Primary warehouse location for this client. Clients are only visible to users with warehouse access.';

-- Migrate existing clients to default warehouse (NEW SOUND)
DO $$
DECLARE
  v_warehouse_id UUID;
BEGIN
  SELECT id INTO v_warehouse_id 
  FROM public.warehouses 
  WHERE LOWER(name) LIKE '%new sound%' 
  LIMIT 1;
  
  IF v_warehouse_id IS NOT NULL THEN
    UPDATE public.clients 
    SET warehouse_id = v_warehouse_id 
    WHERE warehouse_id IS NULL;
    
    RAISE NOTICE 'Migrated existing clients to NEW SOUND Warehouse';
  END IF;
END $$;


-- STEP 4: Add RLS policies for jobs based on warehouse access
-- ============================================

-- First, ensure RLS is enabled on jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on jobs table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'jobs' AND schemaname = 'public') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.jobs';
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- Drop specific policies that might conflict
DROP POLICY IF EXISTS "Users can view jobs from accessible warehouses" ON public.jobs;
DROP POLICY IF EXISTS "Users can insert jobs to accessible warehouses" ON public.jobs;
DROP POLICY IF EXISTS "Users can update jobs from accessible warehouses" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete jobs from accessible warehouses" ON public.jobs;

-- Users can only see jobs from warehouses they have access to
CREATE POLICY "Users can view jobs from accessible warehouses"
  ON public.jobs
  FOR SELECT
  USING (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only create jobs in warehouses they have access to
CREATE POLICY "Users can insert jobs to accessible warehouses"
  ON public.jobs
  FOR INSERT
  WITH CHECK (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only update jobs from warehouses they have access to
CREATE POLICY "Users can update jobs from accessible warehouses"
  ON public.jobs
  FOR UPDATE
  USING (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only delete jobs from warehouses they have access to
CREATE POLICY "Users can delete jobs from accessible warehouses"
  ON public.jobs
  FOR DELETE
  USING (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );


-- STEP 5: Add RLS policies for pull_sheets based on warehouse access
-- ============================================

-- First, ensure RLS is enabled on pull_sheets
ALTER TABLE public.pull_sheets ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on pull_sheets table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'pull_sheets' AND schemaname = 'public') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.pull_sheets';
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- Drop specific policies that might conflict
DROP POLICY IF EXISTS "Users can view pullsheets from accessible warehouses" ON public.pull_sheets;
DROP POLICY IF EXISTS "Users can insert pullsheets to accessible warehouses" ON public.pull_sheets;
DROP POLICY IF EXISTS "Users can update pullsheets from accessible warehouses" ON public.pull_sheets;
DROP POLICY IF EXISTS "Users can delete pullsheets from accessible warehouses" ON public.pull_sheets;

-- Users can only see pullsheets from warehouses they have access to
CREATE POLICY "Users can view pullsheets from accessible warehouses"
  ON public.pull_sheets
  FOR SELECT
  USING (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only create pullsheets in warehouses they have access to
CREATE POLICY "Users can insert pullsheets to accessible warehouses"
  ON public.pull_sheets
  FOR INSERT
  WITH CHECK (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only update pullsheets from warehouses they have access to
CREATE POLICY "Users can update pullsheets from accessible warehouses"
  ON public.pull_sheets
  FOR UPDATE
  USING (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only delete pullsheets from warehouses they have access to
CREATE POLICY "Users can delete pullsheets from accessible warehouses"
  ON public.pull_sheets
  FOR DELETE
  USING (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );


-- STEP 6: Add RLS policies for clients based on warehouse access
-- ============================================

-- First, ensure RLS is enabled on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on clients table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'clients' AND schemaname = 'public') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.clients';
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- Drop specific policies that might conflict
DROP POLICY IF EXISTS "Users can view clients from accessible warehouses" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients to accessible warehouses" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients from accessible warehouses" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients from accessible warehouses" ON public.clients;

-- Users can only see clients from warehouses they have access to
CREATE POLICY "Users can view clients from accessible warehouses"
  ON public.clients
  FOR SELECT
  USING (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only create clients in warehouses they have access to
CREATE POLICY "Users can insert clients to accessible warehouses"
  ON public.clients
  FOR INSERT
  WITH CHECK (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only update clients from warehouses they have access to
CREATE POLICY "Users can update clients from accessible warehouses"
  ON public.clients
  FOR UPDATE
  USING (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only delete clients from warehouses they have access to
CREATE POLICY "Users can delete clients from accessible warehouses"
  ON public.clients
  FOR DELETE
  USING (
    warehouse_id IS NULL 
    OR
    warehouse_id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );


-- ============================================
-- VERIFICATION QUERIES (Run separately to check)
-- ============================================

-- Check jobs with warehouse associations
-- SELECT j.id, j.job_code, j.client_name, w.name as warehouse_name
-- FROM public.jobs j
-- LEFT JOIN public.warehouses w ON w.id = j.warehouse_id
-- ORDER BY j.created_at DESC
-- LIMIT 20;

-- Check pullsheets with warehouse associations
-- SELECT ps.id, ps.name, j.job_code, w.name as warehouse_name
-- FROM public.pull_sheets ps
-- LEFT JOIN public.jobs j ON j.id = ps.job_id
-- LEFT JOIN public.warehouses w ON w.id = ps.warehouse_id
-- ORDER BY ps.created_at DESC
-- LIMIT 20;

-- Check clients with warehouse associations
-- SELECT c.id, c.name, w.name as warehouse_name
-- FROM public.clients c
-- LEFT JOIN public.warehouses w ON w.id = c.warehouse_id
-- ORDER BY c.name;

-- Verify current user can only see their accessible data
-- SELECT 
--   'Jobs' as type, COUNT(*) as count
-- FROM public.jobs
-- WHERE warehouse_id IN (SELECT warehouse_id FROM public.user_warehouse_access WHERE user_id = auth.uid())
-- UNION ALL
-- SELECT 
--   'Pullsheets' as type, COUNT(*) as count
-- FROM public.pull_sheets
-- WHERE warehouse_id IN (SELECT warehouse_id FROM public.user_warehouse_access WHERE user_id = auth.uid())
-- UNION ALL
-- SELECT 
--   'Clients' as type, COUNT(*) as count
-- FROM public.clients
-- WHERE warehouse_id IN (SELECT warehouse_id FROM public.user_warehouse_access WHERE user_id = auth.uid());
