-- ============================================
-- Fix Jobs Warehouse Assignment
-- ============================================

-- First, check current state of jobs
SELECT 
  'Current Jobs State' as check_type,
  j.id,
  j.warehouse_id,
  j.warehouse as warehouse_text,
  w.name as warehouse_name
FROM public.jobs j
LEFT JOIN public.warehouses w ON w.id = j.warehouse_id
ORDER BY j.created_at DESC;

-- Update jobs to New Sound warehouse
DO $$
DECLARE
  v_new_sound_warehouse_id UUID;
  v_jobs_updated INT;
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
  
  -- Update ALL jobs to New Sound warehouse
  UPDATE public.jobs
  SET warehouse_id = v_new_sound_warehouse_id
  WHERE warehouse_id IS NULL OR warehouse_id != v_new_sound_warehouse_id;
  
  GET DIAGNOSTICS v_jobs_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % jobs to New Sound warehouse', v_jobs_updated;
  
  -- Also update TEXT warehouse column if it exists
  UPDATE public.jobs
  SET warehouse = 'New Sound'
  WHERE warehouse IS NOT NULL 
    AND (warehouse ILIKE '%NEW SOUND%' OR warehouse != 'New Sound');
  
  GET DIAGNOSTICS v_jobs_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % jobs warehouse TEXT field', v_jobs_updated;
END $$;

-- Verify the updates
SELECT 
  'Verification' as check_type,
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN warehouse_id IN (SELECT id FROM public.warehouses WHERE name = 'New Sound') THEN 1 END) as jobs_with_new_sound_warehouse_id,
  COUNT(CASE WHEN warehouse = 'New Sound' THEN 1 END) as jobs_with_new_sound_text
FROM public.jobs;
