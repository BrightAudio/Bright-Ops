-- ============================================
-- Diagnose Why Employees Show 0 for New Sound
-- ============================================

-- Check warehouse details
SELECT 'Warehouses' as check_type, id, name, organization_id
FROM public.warehouses
WHERE name ILIKE '%new sound%' OR name ILIKE '%sound%';

-- Check all employees and their warehouse_id
SELECT 'All Employees' as check_type, 
  e.id, 
  e.name, 
  e.warehouse_id,
  w.name as warehouse_name
FROM public.employees e
LEFT JOIN public.warehouses w ON w.id = e.warehouse_id
ORDER BY e.name;

-- Check user warehouse access
SELECT 'User Warehouse Access' as check_type,
  uwa.user_id,
  uwa.warehouse_id,
  w.name as warehouse_name,
  au.email
FROM public.user_warehouse_access uwa
JOIN public.warehouses w ON w.id = uwa.warehouse_id
LEFT JOIN auth.users au ON au.id = uwa.user_id;

-- Count employees by warehouse
SELECT 'Employee Count by Warehouse' as check_type,
  COALESCE(w.name, 'NULL') as warehouse_name,
  COUNT(*) as employee_count
FROM public.employees e
LEFT JOIN public.warehouses w ON w.id = e.warehouse_id
GROUP BY w.name;

-- Check if employees table has warehouse_id column
SELECT 'Column Check' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'employees' 
  AND column_name IN ('warehouse_id', 'warehouse', 'location');
