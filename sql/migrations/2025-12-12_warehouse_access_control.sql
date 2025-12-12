-- ============================================
-- WAREHOUSE ACCESS CONTROL WITH PINS
-- Per-warehouse authentication system
-- ============================================

-- STEP 1: Add PIN column to warehouses table
-- ============================================

ALTER TABLE public.warehouses 
ADD COLUMN IF NOT EXISTS pin TEXT;

-- Create index for PIN lookups
CREATE INDEX IF NOT EXISTS idx_warehouses_pin ON public.warehouses(pin);

COMMENT ON COLUMN public.warehouses.pin IS 'Access PIN for this warehouse location';


-- STEP 2: Create user_warehouse_access junction table
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_warehouse_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, warehouse_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_warehouse_access_user ON public.user_warehouse_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_warehouse_access_warehouse ON public.user_warehouse_access(warehouse_id);

-- Enable RLS
ALTER TABLE public.user_warehouse_access ENABLE ROW LEVEL SECURITY;

-- Users can view their own warehouse access
DROP POLICY IF EXISTS "Users can view own warehouse access" ON public.user_warehouse_access;
CREATE POLICY "Users can view own warehouse access"
  ON public.user_warehouse_access
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can grant themselves access when joining with PIN
DROP POLICY IF EXISTS "Users can grant themselves warehouse access" ON public.user_warehouse_access;
CREATE POLICY "Users can grant themselves warehouse access"
  ON public.user_warehouse_access
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can remove their own warehouse access
DROP POLICY IF EXISTS "Users can remove own warehouse access" ON public.user_warehouse_access;
CREATE POLICY "Users can remove own warehouse access"
  ON public.user_warehouse_access
  FOR DELETE
  USING (user_id = auth.uid());

COMMENT ON TABLE public.user_warehouse_access IS 'Tracks which users have access to which warehouses via PIN authentication';


-- STEP 3: Update warehouse RLS policies to use access table
-- ============================================

-- Users can ONLY view warehouses they have explicit access to
DROP POLICY IF EXISTS "Users can view warehouses in their organization" ON public.warehouses;
DROP POLICY IF EXISTS "Users can view accessible warehouses" ON public.warehouses;
CREATE POLICY "Users can view accessible warehouses"
  ON public.warehouses
  FOR SELECT
  USING (
    -- Can ONLY see warehouses they have explicit access to via user_warehouse_access
    id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );

-- Keep existing create/update/delete policies (restricted to organization)
-- These ensure users can only modify warehouses in their organization
-- But viewing is controlled by PIN access

COMMENT ON TABLE public.warehouses IS 'Warehouse/storage locations with PIN-based access control. Warehouses persist even if no users have access.';


-- STEP 4: Migrate existing data - Add "New Sound" warehouse with PIN 6588
-- ============================================

-- First, ensure we have a "New Sound" warehouse entry
-- We'll look for existing organization to associate it with
DO $$
DECLARE
  v_warehouse_id UUID;
  v_org_id UUID;
BEGIN
  -- Get the first organization (or you can specify a specific one)
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  
  -- Check if "New Sound" warehouse already exists
  SELECT id INTO v_warehouse_id 
  FROM public.warehouses 
  WHERE LOWER(name) LIKE '%new sound%' 
  LIMIT 1;
  
  IF v_warehouse_id IS NULL THEN
    -- Create the warehouse
    INSERT INTO public.warehouses (name, address, organization_id, pin)
    VALUES (
      'NEW SOUND Warehouse',
      'Main warehouse location',
      v_org_id,
      '6588'
    )
    RETURNING id INTO v_warehouse_id;
    
    RAISE NOTICE 'Created NEW SOUND Warehouse with ID: %', v_warehouse_id;
  ELSE
    -- Update existing warehouse with PIN
    UPDATE public.warehouses 
    SET pin = '6588'
    WHERE id = v_warehouse_id;
    
    RAISE NOTICE 'Updated existing NEW SOUND Warehouse (ID: %) with PIN 6588', v_warehouse_id;
  END IF;
  
  -- Grant access to all current users
  INSERT INTO public.user_warehouse_access (user_id, warehouse_id, granted_by)
  SELECT 
    u.id,
    v_warehouse_id,
    NULL  -- System granted
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_warehouse_access 
    WHERE user_id = u.id AND warehouse_id = v_warehouse_id
  );
  
  RAISE NOTICE 'Granted NEW SOUND Warehouse access to all current users';
  
END $$;


-- STEP 5: Create Bright Audio Warehouse (if needed)
-- ============================================

DO $$
DECLARE
  v_warehouse_id UUID;
  v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  
  -- Check if "Bright Audio" warehouse exists
  SELECT id INTO v_warehouse_id 
  FROM public.warehouses 
  WHERE LOWER(name) LIKE '%bright audio%' 
  LIMIT 1;
  
  IF v_warehouse_id IS NULL THEN
    -- Create warehouse without PIN (to be set by admin later)
    INSERT INTO public.warehouses (name, address, organization_id)
    VALUES (
      'Bright Audio Warehouse',
      'Secondary warehouse location',
      v_org_id
    )
    RETURNING id INTO v_warehouse_id;
    
    RAISE NOTICE 'Created Bright Audio Warehouse with ID: %', v_warehouse_id;
  END IF;
  
END $$;


-- STEP 6: Create function to verify and join warehouse with PIN
-- ============================================
-- This function allows users to join a warehouse without seeing all warehouses
-- It checks the name + PIN combo and grants access if valid

CREATE OR REPLACE FUNCTION public.join_warehouse_with_pin(
  p_warehouse_name TEXT,
  p_pin TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  warehouse_id UUID,
  warehouse_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to bypass RLS
SET search_path = public
AS $$
DECLARE
  v_warehouse_id UUID;
  v_warehouse_name TEXT;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Find warehouse by name (case-insensitive) and PIN (exact match)
  SELECT w.id, w.name INTO v_warehouse_id, v_warehouse_name
  FROM public.warehouses w
  WHERE LOWER(w.name) = LOWER(TRIM(p_warehouse_name))
    AND w.pin = p_pin
  LIMIT 1;
  
  -- Check if warehouse found
  IF v_warehouse_id IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid warehouse name or PIN'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check if user already has access
  IF EXISTS (
    SELECT 1 FROM public.user_warehouse_access
    WHERE user_id = v_user_id AND warehouse_id = v_warehouse_id
  ) THEN
    RETURN QUERY SELECT false, 'You already have access to this warehouse'::TEXT, v_warehouse_id, v_warehouse_name;
    RETURN;
  END IF;
  
  -- Grant access
  INSERT INTO public.user_warehouse_access (user_id, warehouse_id, granted_by)
  VALUES (v_user_id, v_warehouse_id, v_user_id);
  
  -- Return success
  RETURN QUERY SELECT true, 'Access granted successfully'::TEXT, v_warehouse_id, v_warehouse_name;
END;
$$;

COMMENT ON FUNCTION public.join_warehouse_with_pin IS 'Allows users to join a warehouse by providing correct name + PIN combination. Uses SECURITY DEFINER to bypass RLS for warehouse lookup.';


-- STEP 7: Add RLS policies for inventory_items based on warehouse access
-- ============================================
-- Users can only see inventory from warehouses they have access to
-- This ensures that inventory persists even if a user loses access

-- First, ensure RLS is enabled on inventory_items
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Drop any existing inventory RLS policies that might conflict
DROP POLICY IF EXISTS "Users can view inventory from accessible warehouses" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can view all inventory" ON public.inventory_items;

-- Create new policy: Users can only see inventory from warehouses they have access to
CREATE POLICY "Users can view inventory from accessible warehouses"
  ON public.inventory_items
  FOR SELECT
  USING (
    -- If location is NULL or empty, everyone can see it (backwards compatibility)
    location IS NULL 
    OR location = ''
    OR
    -- Otherwise, check if user has access to a warehouse matching this location name
    location IN (
      SELECT w.name
      FROM public.warehouses w
      JOIN public.user_warehouse_access uwa ON uwa.warehouse_id = w.id
      WHERE uwa.user_id = auth.uid()
    )
  );

-- Allow users to insert inventory to warehouses they have access to
DROP POLICY IF EXISTS "Users can insert inventory to accessible warehouses" ON public.inventory_items;
CREATE POLICY "Users can insert inventory to accessible warehouses"
  ON public.inventory_items
  FOR INSERT
  WITH CHECK (
    -- Can insert without location
    location IS NULL 
    OR location = ''
    OR
    -- Or can insert to warehouses they have access to
    location IN (
      SELECT w.name
      FROM public.warehouses w
      JOIN public.user_warehouse_access uwa ON uwa.warehouse_id = w.id
      WHERE uwa.user_id = auth.uid()
    )
  );

-- Allow users to update inventory from warehouses they have access to
DROP POLICY IF EXISTS "Users can update inventory from accessible warehouses" ON public.inventory_items;
CREATE POLICY "Users can update inventory from accessible warehouses"
  ON public.inventory_items
  FOR UPDATE
  USING (
    location IS NULL 
    OR location = ''
    OR
    location IN (
      SELECT w.name
      FROM public.warehouses w
      JOIN public.user_warehouse_access uwa ON uwa.warehouse_id = w.id
      WHERE uwa.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- After update, location must still be accessible
    location IS NULL 
    OR location = ''
    OR
    location IN (
      SELECT w.name
      FROM public.warehouses w
      JOIN public.user_warehouse_access uwa ON uwa.warehouse_id = w.id
      WHERE uwa.user_id = auth.uid()
    )
  );

-- Allow users to delete inventory from warehouses they have access to
DROP POLICY IF EXISTS "Users can delete inventory from accessible warehouses" ON public.inventory_items;
CREATE POLICY "Users can delete inventory from accessible warehouses"
  ON public.inventory_items
  FOR DELETE
  USING (
    location IS NULL 
    OR location = ''
    OR
    location IN (
      SELECT w.name
      FROM public.warehouses w
      JOIN public.user_warehouse_access uwa ON uwa.warehouse_id = w.id
      WHERE uwa.user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can view inventory from accessible warehouses" ON public.inventory_items IS 'Users can only see inventory items from warehouses they have access to. Items persist even if user loses access.';


-- ============================================
-- VERIFICATION QUERIES (Run separately to check)
-- ============================================

-- Check warehouses with PINs
-- SELECT id, name, pin, organization_id FROM public.warehouses;

-- Check user warehouse access
-- SELECT 
--   uwa.id,
--   up.email,
--   up.full_name,
--   w.name as warehouse_name,
--   w.pin as warehouse_pin,
--   uwa.granted_at
-- FROM public.user_warehouse_access uwa
-- JOIN public.user_profiles up ON up.id = uwa.user_id
-- JOIN public.warehouses w ON w.id = uwa.warehouse_id
-- ORDER BY up.email, w.name;

-- Check current user's warehouse access
-- SELECT 
--   w.id,
--   w.name,
--   w.pin,
--   w.address
-- FROM public.warehouses w
-- JOIN public.user_warehouse_access uwa ON uwa.warehouse_id = w.id
-- WHERE uwa.user_id = auth.uid();

-- Test joining a warehouse
-- SELECT * FROM public.join_warehouse_with_pin('NEW SOUND Warehouse', '6588');
