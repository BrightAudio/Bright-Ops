-- ============================================
-- FIX: Allow users to see warehouses in their organization during onboarding
-- ============================================

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view accessible warehouses" ON public.warehouses;

-- Create new policy: Users can see warehouses they have access to OR warehouses in their organization
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
