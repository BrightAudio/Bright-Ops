-- ============================================
-- Fix Employees and Pull Sheets Warehouse Assignment
-- ============================================

DO $$
DECLARE
  v_new_sound_warehouse_id UUID;
  v_employees_updated INT;
  v_pull_sheets_updated INT;
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
  
  -- Update ALL employees to New Sound warehouse
  UPDATE public.employees
  SET warehouse_id = v_new_sound_warehouse_id
  WHERE warehouse_id IS NULL OR warehouse_id != v_new_sound_warehouse_id;
  
  GET DIAGNOSTICS v_employees_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % employees to New Sound warehouse', v_employees_updated;
  
  -- Update ALL pull_sheets to New Sound warehouse
  UPDATE public.pull_sheets
  SET warehouse_id = v_new_sound_warehouse_id
  WHERE warehouse_id IS NULL OR warehouse_id != v_new_sound_warehouse_id;
  
  GET DIAGNOSTICS v_pull_sheets_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % pull_sheets to New Sound warehouse', v_pull_sheets_updated;
END $$;

-- Verify the updates
SELECT 
  'employees' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN warehouse_id IN (SELECT id FROM public.warehouses WHERE name = 'New Sound') THEN 1 END) as new_sound_count
FROM public.employees
UNION ALL
SELECT 
  'pull_sheets',
  COUNT(*),
  COUNT(CASE WHEN warehouse_id IN (SELECT id FROM public.warehouses WHERE name = 'New Sound') THEN 1 END)
FROM public.pull_sheets;
