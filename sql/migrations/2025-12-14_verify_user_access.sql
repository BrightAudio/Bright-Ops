-- ============================================
-- Verify User Warehouse Access and Inventory
-- ============================================

-- Check your user profile and organization
SELECT 
  up.id as user_id,
  up.email,
  up.organization_id,
  o.name as org_name,
  o.business_pin
FROM public.user_profiles up
LEFT JOIN public.organizations o ON o.id = up.organization_id
WHERE up.email = 'YOUR_EMAIL_HERE';  -- Replace with your email

-- Check your warehouse access
SELECT 
  uwa.user_id,
  uwa.warehouse_id,
  w.name as warehouse_name,
  w.organization_id
FROM public.user_warehouse_access uwa
JOIN public.warehouses w ON w.id = uwa.warehouse_id
WHERE uwa.user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE');  -- Replace with your email

-- Check inventory items in the New Sound warehouse
SELECT 
  i.id,
  i.name,
  i.quantity,
  i.warehouse_id,
  w.name as warehouse_name
FROM public.inventory_items i
JOIN public.warehouses w ON w.id = i.warehouse_id
WHERE w.name = 'New Sound'
LIMIT 10;

-- If you have NO warehouse access, run this to grant it:
/*
INSERT INTO public.user_warehouse_access (user_id, warehouse_id)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'),  -- Replace with your email
  (SELECT id FROM public.warehouses WHERE name = 'New Sound' LIMIT 1)
ON CONFLICT (user_id, warehouse_id) DO NOTHING;
*/
