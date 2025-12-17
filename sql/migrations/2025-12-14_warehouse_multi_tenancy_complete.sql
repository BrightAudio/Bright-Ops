-- ============================================
-- WAREHOUSE MULTI-TENANCY: Tie All Data to Warehouses
-- ============================================

-- This migration ensures ALL user-generated data is tied to warehouse locations
-- for proper multi-tenant isolation

-- ============================================
-- STEP 1: Add warehouse_id to tables that don't have it
-- ============================================

-- Training videos/modules
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_modules') THEN
    ALTER TABLE public.training_modules 
    ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_training_modules_warehouse ON public.training_modules(warehouse_id);
  END IF;
END $$;

-- Archived equipment (if exists as separate table)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'archived_equipment') THEN
    ALTER TABLE public.archived_equipment 
    ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_archived_equipment_warehouse ON public.archived_equipment(warehouse_id);
  END IF;
END $$;

-- Venues (if separate from clients)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues') THEN
    ALTER TABLE public.venues 
    ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_venues_warehouse ON public.venues(warehouse_id);
  END IF;
END $$;

-- Projects (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
    ALTER TABLE public.projects 
    ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_projects_warehouse ON public.projects(warehouse_id);
  END IF;
END $$;


-- ============================================
-- STEP 2: Update RLS policies to filter by warehouse access
-- ============================================

-- Training modules RLS (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_modules') THEN
    DROP POLICY IF EXISTS "Users can view training from accessible warehouses" ON public.training_modules;
    CREATE POLICY "Users can view training from accessible warehouses"
      ON public.training_modules
      FOR SELECT
      USING (
        warehouse_id IN (
          SELECT warehouse_id 
          FROM public.user_warehouse_access 
          WHERE user_id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS "Users can manage training in accessible warehouses" ON public.training_modules;
    CREATE POLICY "Users can manage training in accessible warehouses"
      ON public.training_modules
      FOR ALL
      USING (
        warehouse_id IN (
          SELECT warehouse_id 
          FROM public.user_warehouse_access 
          WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        warehouse_id IN (
          SELECT warehouse_id 
          FROM public.user_warehouse_access 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;


-- ============================================
-- STEP 3: Migrate existing data to default warehouse
-- ============================================

-- Set default warehouse for existing records without warehouse_id
DO $$
DECLARE
  v_default_warehouse_id UUID;
BEGIN
  -- Get the "New Sound" warehouse as default
  SELECT id INTO v_default_warehouse_id
  FROM public.warehouses
  WHERE name = 'New Sound'
  LIMIT 1;
  
  IF v_default_warehouse_id IS NOT NULL THEN
    -- Update training modules
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_modules') THEN
      UPDATE public.training_modules
      SET warehouse_id = v_default_warehouse_id
      WHERE warehouse_id IS NULL;
      
      RAISE NOTICE 'Updated training_modules to use warehouse: %', v_default_warehouse_id;
    END IF;
    
    -- Update archived equipment
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'archived_equipment') THEN
      UPDATE public.archived_equipment
      SET warehouse_id = v_default_warehouse_id
      WHERE warehouse_id IS NULL;
      
      RAISE NOTICE 'Updated archived_equipment to use warehouse: %', v_default_warehouse_id;
    END IF;
    
    -- Update venues
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues') THEN
      UPDATE public.venues
      SET warehouse_id = v_default_warehouse_id
      WHERE warehouse_id IS NULL;
      
      RAISE NOTICE 'Updated venues to use warehouse: %', v_default_warehouse_id;
    END IF;
    
    -- Update projects
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
      UPDATE public.projects
      SET warehouse_id = v_default_warehouse_id
      WHERE warehouse_id IS NULL;
      
      RAISE NOTICE 'Updated projects to use warehouse: %', v_default_warehouse_id;
    END IF;
  ELSE
    RAISE NOTICE 'No "New Sound" warehouse found - skipping data migration';
  END IF;
END $$;


-- ============================================
-- STEP 4: Verify warehouse associations
-- ============================================

-- Show which tables have warehouse_id and how many records
SELECT 
  'jobs' as table_name,
  COUNT(*) as total_records,
  COUNT(warehouse_id) as with_warehouse,
  COUNT(*) - COUNT(warehouse_id) as without_warehouse
FROM public.jobs
UNION ALL
SELECT 
  'clients',
  COUNT(*),
  COUNT(warehouse_id),
  COUNT(*) - COUNT(warehouse_id)
FROM public.clients
UNION ALL
SELECT 
  'pull_sheets',
  COUNT(*),
  COUNT(warehouse_id),
  COUNT(*) - COUNT(warehouse_id)
FROM public.pull_sheets
UNION ALL
SELECT 
  'employees',
  COUNT(*),
  COUNT(warehouse_id),
  COUNT(*) - COUNT(warehouse_id)
FROM public.employees;
