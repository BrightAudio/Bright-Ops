-- ============================================
-- Rename "New Sound Warehouse" organization to "New Sound"
-- ============================================

UPDATE public.organizations
SET name = 'New Sound'
WHERE name ILIKE '%New Sound Warehouse%';

-- Verify the change
SELECT id, name, business_pin, created_at
FROM public.organizations
WHERE name ILIKE '%New Sound%';
