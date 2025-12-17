-- ============================================
-- Fix Location Mismatch: Update inventory to use "New Sound"
-- ============================================

-- Option 1: Update all inventory items from "NEW SOUND Warehouse" to "New Sound"
UPDATE public.inventory_items
SET location = 'New Sound'
WHERE location ILIKE 'NEW SOUND Warehouse';

-- Verify the change
SELECT 
  COUNT(*) as total_items,
  location
FROM public.inventory_items
GROUP BY location
ORDER BY total_items DESC;

-- Check that inventory items now match the warehouse name
SELECT 
  i.id,
  i.name,
  i.location,
  w.name as warehouse_name,
  (i.location = w.name) as matches
FROM public.inventory_items i
CROSS JOIN public.warehouses w
WHERE w.name = 'New Sound'
  AND i.location ILIKE '%sound%'
LIMIT 5;
