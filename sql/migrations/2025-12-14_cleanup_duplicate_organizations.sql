-- ============================================
-- Clean up duplicate "New Sound" organizations
-- ============================================

-- First, let's see what duplicates exist
SELECT id, name, business_pin, created_at
FROM public.organizations
WHERE name ILIKE '%New Sound%'
ORDER BY created_at ASC;

-- Keep the OLDEST one and delete the duplicates
-- (Uncomment the DELETE after verifying which one to keep)

/*
DELETE FROM public.organizations
WHERE name ILIKE '%New Sound%'
AND id NOT IN (
  SELECT id 
  FROM public.organizations 
  WHERE name ILIKE '%New Sound%'
  ORDER BY created_at ASC
  LIMIT 1
);
*/

-- After deleting, verify only one remains
SELECT id, name, business_pin, created_at
FROM public.organizations
WHERE name ILIKE '%New Sound%';
