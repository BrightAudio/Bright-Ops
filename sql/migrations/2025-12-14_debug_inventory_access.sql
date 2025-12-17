-- ============================================
-- Debug: Check Inventory RLS and Warehouse Access
-- ============================================

-- 1. Check current RLS policies on inventory_items
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'inventory_items';

-- 2. Check if inventory_items have location set
SELECT 
  COUNT(*) as total_items,
  location
FROM public.inventory_items
GROUP BY location
ORDER BY total_items DESC;

-- 3. Check what warehouses you have access to
SELECT 
  w.id,
  w.name,
  w.pin,
  uwa.user_id,
  u.email
FROM public.warehouses w
JOIN public.user_warehouse_access uwa ON uwa.warehouse_id = w.id
JOIN auth.users u ON u.id = uwa.user_id
WHERE w.name = 'New Sound';

-- 4. Check inventory items with location
SELECT 
  i.id,
  i.name,
  i.location,
  i.qty_in_warehouse
FROM public.inventory_items i
WHERE i.location ILIKE '%New Sound%'
LIMIT 10;
