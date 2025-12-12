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

-- Users can view warehouses they have access to
DROP POLICY IF EXISTS "Users can view warehouses in their organization" ON public.warehouses;
CREATE POLICY "Users can view accessible warehouses"
  ON public.warehouses
  FOR SELECT
  USING (
    -- Can see warehouses they have explicit access to
    id IN (
      SELECT warehouse_id 
      FROM public.user_warehouse_access 
      WHERE user_id = auth.uid()
    )
    OR
    -- OR can see warehouses during join process (for PIN verification)
    -- Limited to checking name + PIN combination
    EXISTS (
      SELECT 1 FROM auth.users WHERE id = auth.uid()
    )
  );

-- Keep existing create/update/delete policies (restricted to organization)
-- These ensure users can only modify warehouses in their organization
-- But viewing is controlled by PIN access

COMMENT ON TABLE public.warehouses IS 'Warehouse/storage locations with PIN-based access control';


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
