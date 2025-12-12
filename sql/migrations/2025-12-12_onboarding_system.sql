-- ============================================
-- MULTI-TENANT ONBOARDING: Organizations & Warehouses
-- Run this in Supabase SQL Editor after adding organization_id to organizations table
-- ============================================

-- STEP 1: Create warehouses table (if it doesn't exist)
-- ============================================

CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_warehouses_organization ON public.warehouses(organization_id);

-- Enable RLS
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see warehouses in their organization
DROP POLICY IF EXISTS "Users can view warehouses in their organization" ON public.warehouses;
CREATE POLICY "Users can view warehouses in their organization"
  ON public.warehouses
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create warehouses in their organization" ON public.warehouses;
CREATE POLICY "Users can create warehouses in their organization"
  ON public.warehouses
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update warehouses in their organization" ON public.warehouses;
CREATE POLICY "Users can update warehouses in their organization"
  ON public.warehouses
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete warehouses in their organization" ON public.warehouses;
CREATE POLICY "Users can delete warehouses in their organization"
  ON public.warehouses
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_warehouses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS warehouses_updated_at ON public.warehouses;
CREATE TRIGGER warehouses_updated_at
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouses_updated_at();

COMMENT ON TABLE public.warehouses IS 'Warehouse/storage locations for each organization';


-- STEP 2: Update user_profiles RLS to allow organization join
-- ============================================

-- Allow users to read their own profile with organization data
DROP POLICY IF EXISTS "Users can view own profile with org" ON public.user_profiles;
CREATE POLICY "Users can view own profile with org"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);


-- STEP 3: Enable RLS on organizations
-- ============================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Users can view their own organization OR any organization during onboarding (before they have an org_id)
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
CREATE POLICY "Users can view their organization"
  ON public.organizations
  FOR SELECT
  USING (
    -- Can see their assigned organization
    id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
    OR
    -- OR any organization if they don't have one yet (for onboarding)
    NOT EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND organization_id IS NOT NULL
    )
  );

-- Users can update their own organization (managers only)
DROP POLICY IF EXISTS "Managers can update their organization" ON public.organizations;
CREATE POLICY "Managers can update their organization"
  ON public.organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'manager'
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- Anyone authenticated can create an organization (for onboarding)
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ============================================
-- VERIFICATION QUERIES (Run separately)
-- ============================================

-- Check warehouses table
-- SELECT * FROM public.warehouses;

-- Check organizations RLS
-- SELECT * FROM public.organizations;

-- Check if user has organization
-- SELECT id, email, organization_id FROM public.user_profiles WHERE id = auth.uid();
