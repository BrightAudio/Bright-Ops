-- ============================================
-- Fix Duplicate "New Sound" Organizations
-- ============================================

-- Keep: 4b50f06f-a6a6-4dc2-8a38-a01eeb6a7866 (has warehouse)
-- Delete: fed6cedf-1cbf-4935-81ee-18d0fe4f98e1 (no warehouse)

DO $$
DECLARE
  v_keep_org_id UUID := '4b50f06f-a6a6-4dc2-8a38-a01eeb6a7866';
  v_delete_org_id UUID := 'fed6cedf-1cbf-4935-81ee-18d0fe4f98e1';
  v_affected_users INT;
BEGIN
  -- Move any users from the duplicate org to the correct org
  UPDATE public.user_profiles
  SET organization_id = v_keep_org_id
  WHERE organization_id = v_delete_org_id;
  
  GET DIAGNOSTICS v_affected_users = ROW_COUNT;
  RAISE NOTICE 'Migrated % users from duplicate org to correct org', v_affected_users;
  
  -- Delete the duplicate organization
  DELETE FROM public.organizations
  WHERE id = v_delete_org_id;
  
  RAISE NOTICE 'Deleted duplicate organization: %', v_delete_org_id;
  RAISE NOTICE 'Kept organization with warehouse: %', v_keep_org_id;
END $$;

-- Verify - should only show one "New Sound" organization now
SELECT 
  o.id as org_id,
  o.name as org_name,
  o.business_pin,
  w.id as warehouse_id,
  w.name as warehouse_name,
  w.pin as warehouse_pin,
  w.address,
  (SELECT COUNT(*) FROM public.user_profiles WHERE organization_id = o.id) as user_count
FROM public.organizations o
LEFT JOIN public.warehouses w ON w.organization_id = o.id
WHERE o.name ILIKE 'New Sound'
ORDER BY o.created_at ASC;
