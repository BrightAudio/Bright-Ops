-- ============================================
-- Fix All Data After Warehouse Rename: NEW SOUND Warehouse → New Sound
-- ============================================

-- STEP 1: Check current state of all data
-- ============================================

-- Check inventory locations
SELECT 'inventory_items' as table_name, location as value, COUNT(*) as count
FROM public.inventory_items
GROUP BY location
UNION ALL
-- Check job warehouse references (if using TEXT column)
SELECT 'jobs (warehouse TEXT)', warehouse, COUNT(*)
FROM public.jobs
WHERE warehouse IS NOT NULL
GROUP BY warehouse
UNION ALL
-- Check clients warehouse_id
SELECT 'clients (warehouse_id)', w.name, COUNT(*)
FROM public.clients c
LEFT JOIN public.warehouses w ON w.id = c.warehouse_id
GROUP BY w.name
UNION ALL
-- Check employees warehouse_id
SELECT 'employees (warehouse_id)', w.name, COUNT(*)
FROM public.employees e
LEFT JOIN public.warehouses w ON w.id = e.warehouse_id
GROUP BY w.name
UNION ALL
-- Check pull_sheets warehouse_id
SELECT 'pull_sheets (warehouse_id)', w.name, COUNT(*)
FROM public.pull_sheets ps
LEFT JOIN public.warehouses w ON w.id = ps.warehouse_id
GROUP BY w.name
ORDER BY table_name, value;


-- STEP 2: Update all TEXT-based warehouse references
-- ============================================

-- Update jobs table (if it uses TEXT warehouse column)
UPDATE public.jobs
SET warehouse = 'New Sound'
WHERE warehouse ILIKE 'NEW SOUND Warehouse' OR warehouse ILIKE 'NEW SOUND';

-- Update any other tables with TEXT warehouse columns
-- (Add more UPDATE statements as needed for other tables)


-- STEP 3: Update UUID-based warehouse_id references
-- ============================================

DO $$
DECLARE
  v_new_sound_warehouse_id UUID;
BEGIN
  -- Get the New Sound warehouse ID
  SELECT id INTO v_new_sound_warehouse_id
  FROM public.warehouses
  WHERE name = 'New Sound'
  LIMIT 1;
  
  IF v_new_sound_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'New Sound warehouse not found!';
  END IF;
  
  RAISE NOTICE 'Using New Sound warehouse ID: %', v_new_sound_warehouse_id;
  
  -- Update clients without warehouse_id
  UPDATE public.clients
  SET warehouse_id = v_new_sound_warehouse_id
  WHERE warehouse_id IS NULL;
  
  RAISE NOTICE 'Updated % clients', (SELECT COUNT(*) FROM public.clients WHERE warehouse_id = v_new_sound_warehouse_id);
  
  -- Update employees without warehouse_id
  UPDATE public.employees
  SET warehouse_id = v_new_sound_warehouse_id
  WHERE warehouse_id IS NULL;
  
  RAISE NOTICE 'Updated % employees', (SELECT COUNT(*) FROM public.employees WHERE warehouse_id = v_new_sound_warehouse_id);
  
  -- Update pull_sheets without warehouse_id
  UPDATE public.pull_sheets
  SET warehouse_id = v_new_sound_warehouse_id
  WHERE warehouse_id IS NULL;
  
  RAISE NOTICE 'Updated % pull_sheets', (SELECT COUNT(*) FROM public.pull_sheets WHERE warehouse_id = v_new_sound_warehouse_id);
  
  -- Update jobs without warehouse_id (if the column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'warehouse_id'
  ) THEN
    UPDATE public.jobs
    SET warehouse_id = v_new_sound_warehouse_id
    WHERE warehouse_id IS NULL;
    
    RAISE NOTICE 'Updated % jobs (warehouse_id)', (SELECT COUNT(*) FROM public.jobs WHERE warehouse_id = v_new_sound_warehouse_id);
  END IF;
END $$;


-- STEP 4: Verify all data is now associated with New Sound
-- ============================================

-- Final verification
SELECT 
  'inventory_items' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN location = 'New Sound' THEN 1 END) as new_sound_count
FROM public.inventory_items
UNION ALL
SELECT 
  'jobs',
  COUNT(*),
  COUNT(CASE WHEN warehouse = 'New Sound' OR warehouse_id IN (SELECT id FROM public.warehouses WHERE name = 'New Sound') THEN 1 END)
FROM public.jobs
UNION ALL
SELECT 
  'clients',
  COUNT(*),
  COUNT(CASE WHEN warehouse_id IN (SELECT id FROM public.warehouses WHERE name = 'New Sound') THEN 1 END)
FROM public.clients
UNION ALL
SELECT 
  'employees',
  COUNT(*),
  COUNT(CASE WHEN warehouse_id IN (SELECT id FROM public.warehouses WHERE name = 'New Sound') THEN 1 END)
FROM public.employees
UNION ALL
SELECT 
  'pull_sheets',
  COUNT(*),
  COUNT(CASE WHEN warehouse_id IN (SELECT id FROM public.warehouses WHERE name = 'New Sound') THEN 1 END)
FROM public.pull_sheets;
