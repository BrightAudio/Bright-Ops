-- ============================================
-- COMPLETE ONBOARDING FIX: RLS + Warehouse Setup
-- ============================================

-- STEP 1: Fix RLS policy to allow viewing warehouses in user's organization
-- ============================================

DROP POLICY IF EXISTS "Users can view accessible warehouses" ON public.warehouses;

CREATE POLICY "Users can view accessible warehouses"
  ON public.warehouses
  FOR SELECT
  USING (
    -- Option 1: Has explicit access via user_warehouse_access (for existing users)
    id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
    OR
    -- Option 2: Warehouse belongs to user's organization (for onboarding)
    organization_id IN (
      SELECT organization_id 
      FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can view accessible warehouses" ON public.warehouses IS 
  'Users can view warehouses they have explicit access to (via PIN) OR warehouses in their organization (for onboarding)';


-- STEP 2: Ensure "New Sound" organization has a warehouse
-- ============================================

DO $$
DECLARE
  v_org_id UUID;
  v_warehouse_id UUID;
BEGIN
  -- Find the "New Sound" organization
  SELECT id INTO v_org_id
  FROM public.organizations
  WHERE name ILIKE 'New Sound'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'No "New Sound" organization found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found "New Sound" organization: %', v_org_id;

  -- Check if warehouse already exists
  SELECT id INTO v_warehouse_id
  FROM public.warehouses
  WHERE organization_id = v_org_id
  LIMIT 1;

  IF v_warehouse_id IS NOT NULL THEN
    RAISE NOTICE 'Warehouse already exists: %', v_warehouse_id;
    
    -- Update the warehouse to ensure it has correct data
    UPDATE public.warehouses
    SET 
      name = 'New Sound',
      pin = '6588'
    WHERE id = v_warehouse_id;
    
    RAISE NOTICE 'Updated warehouse with name and PIN';
  ELSE
    -- Create new warehouse
    INSERT INTO public.warehouses (name, address, organization_id, pin)
    VALUES ('New Sound', '123 Main Street', v_org_id, '6588')
    RETURNING id INTO v_warehouse_id;
    
    RAISE NOTICE 'Created new warehouse: %', v_warehouse_id;
  END IF;

END $$;


-- STEP 3: Verify the setup
-- ============================================

SELECT 
  o.id as org_id,
  o.name as org_name,
  o.business_pin,
  w.id as warehouse_id,
  w.name as warehouse_name,
  w.pin as warehouse_pin,
  w.address
FROM public.organizations o
LEFT JOIN public.warehouses w ON w.organization_id = o.id
WHERE o.name ILIKE 'New Sound'
ORDER BY o.created_at ASC;
