-- Enable RLS on Stripe Events, Licenses, and License History
-- Run this in Supabase SQL Editor
-- Schema: licenses has org_id, license_history references license_id, stripe_events is global

-- ============================================
-- Step 1: Enable RLS on all 3 tables
-- ============================================

ALTER TABLE IF EXISTS public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.license_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.license_devices ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 2: Stripe Events
-- ============================================
-- NOTE: Stripe events are global (no org_id). Only service_role can read.
-- You'll query these via authenticated API endpoints that verify org ownership.

DROP POLICY IF EXISTS "Service role only for stripe events" ON public.stripe_events;
CREATE POLICY "Service role only for stripe events"
  ON public.stripe_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Step 3: Licenses - Already has RLS
-- ============================================
-- (RLS already configured in migration, just verify it's enabled)
-- Users can view/update their org's license

DROP POLICY IF EXISTS "Users can view their organization license" ON public.licenses;
CREATE POLICY "Users can view their organization license"
  ON public.licenses
  FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM public.user_profiles 
      WHERE id = auth.uid() LIMIT 1
    )
  );

DROP POLICY IF EXISTS "Users can update their organization license" ON public.licenses;
CREATE POLICY "Users can update their organization license"
  ON public.licenses
  FOR UPDATE
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM public.user_profiles 
      WHERE id = auth.uid() LIMIT 1
    )
  )
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM public.user_profiles 
      WHERE id = auth.uid() LIMIT 1
    )
  );

-- ============================================
-- Step 4: License History
-- ============================================
-- Audit trail - users can see history for licenses in their org
-- (references license_id → licenses.organization_id)

DROP POLICY IF EXISTS "Users can view license history for their org" ON public.license_history;
CREATE POLICY "Users can view license history for their org"
  ON public.license_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.licenses lic
      WHERE lic.id = license_id
      AND lic.organization_id = (
        SELECT organization_id FROM public.user_profiles 
        WHERE id = auth.uid() LIMIT 1
      )
    )
  );

DROP POLICY IF EXISTS "Service role can insert license history" ON public.license_history;
CREATE POLICY "Service role can insert license history"
  ON public.license_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================
-- Step 5: License Devices
-- ============================================
-- Device tracking - users can see devices for licenses in their org

DROP POLICY IF EXISTS "Users can view devices for their org licenses" ON public.license_devices;
CREATE POLICY "Users can view devices for their org licenses"
  ON public.license_devices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.licenses lic
      WHERE lic.id = license_id
      AND lic.organization_id = (
        SELECT organization_id FROM public.user_profiles 
        WHERE id = auth.uid() LIMIT 1
      )
    )
  );

-- ============================================
-- Verification
-- ============================================
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status,
  (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = pt.tablename) as num_policies
FROM pg_tables pt
WHERE schemaname = 'public' AND tablename IN (
  'stripe_events', 'licenses', 'license_history', 'license_devices'
)
ORDER BY tablename;
