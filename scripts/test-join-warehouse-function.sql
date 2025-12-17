-- ============================================
-- TEST SCRIPT FOR join_warehouse_with_pin FUNCTION
-- Run this in Supabase SQL Editor to verify the function works
-- ============================================

-- Check if function exists
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  p.prosecdef as is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'join_warehouse_with_pin';

-- If function exists, this should return one row
-- If empty result, the function hasn't been created yet


-- Check if warehouses table has PIN column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'warehouses' 
  AND column_name = 'pin';


-- Check if user_warehouse_access table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name = 'user_warehouse_access'
) as table_exists;


-- List all warehouses with their PINs (if any)
SELECT id, name, pin, created_at
FROM public.warehouses
ORDER BY name;


-- Test the function (replace with actual warehouse name and PIN)
-- SELECT * FROM public.join_warehouse_with_pin('NEW SOUND Warehouse', '6588');
