-- ============================================================================
-- COMBINED MIGRATIONS - Run this in Supabase SQL Editor
-- Date: 2025-11-12
-- Description: All pending migrations combined into one file
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: Add archived column to jobs table
-- ============================================================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_archived ON public.jobs(archived);

COMMENT ON COLUMN public.jobs.archived IS 'When true, job is moved to archive view (hidden from main list by default)';

-- ============================================================================
-- MIGRATION 2: Update transports table schema
-- ============================================================================
ALTER TABLE public.transports
  ADD COLUMN IF NOT EXISTS vehicle TEXT,
  ADD COLUMN IF NOT EXISTS driver TEXT,
  ADD COLUMN IF NOT EXISTS depart_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arrive_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Migrate existing data from old columns to new ones
UPDATE public.transports
SET 
  depart_at = scheduled_at
WHERE depart_at IS NULL AND scheduled_at IS NOT NULL;

-- Create indexes for the new datetime columns
CREATE INDEX IF NOT EXISTS idx_transports_depart_at ON public.transports(depart_at);
CREATE INDEX IF NOT EXISTS idx_transports_arrive_at ON public.transports(arrive_at);

-- ============================================================================
-- MIGRATION 3: Add pull sheet scans and substitutions tracking
-- ============================================================================

-- Create pull_sheet_scans table
CREATE TABLE IF NOT EXISTS public.pull_sheet_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_sheet_id uuid NOT NULL REFERENCES public.pull_sheets(id) ON DELETE CASCADE,
  pull_sheet_item_id uuid REFERENCES public.pull_sheet_items(id) ON DELETE SET NULL,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  barcode text NOT NULL,
  scan_type text NOT NULL CHECK (scan_type IN ('pull', 'return', 'verify')),
  scanned_by text,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for pull_sheet_scans
CREATE INDEX IF NOT EXISTS idx_pull_sheet_scans_pull_sheet_id ON public.pull_sheet_scans(pull_sheet_id);
CREATE INDEX IF NOT EXISTS idx_pull_sheet_scans_item_id ON public.pull_sheet_scans(pull_sheet_item_id);
CREATE INDEX IF NOT EXISTS idx_pull_sheet_scans_scanned_at ON public.pull_sheet_scans(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_pull_sheet_scans_barcode ON public.pull_sheet_scans(barcode);

-- Add RLS policy for pull_sheet_scans
ALTER TABLE public.pull_sheet_scans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to pull_sheet_scans" ON public.pull_sheet_scans;
CREATE POLICY "Allow all access to pull_sheet_scans" 
  ON public.pull_sheet_scans FOR ALL TO public 
  USING (true) WITH CHECK (true);

-- Add comments for pull_sheet_scans
COMMENT ON TABLE public.pull_sheet_scans IS 'Tracks all barcode scans for pull sheet items (pull, return, verify)';
COMMENT ON COLUMN public.pull_sheet_scans.scan_type IS 'Type of scan: pull (item pulled from warehouse), return (item returned), verify (verification scan)';

-- Create pull_sheet_substitutions table
CREATE TABLE IF NOT EXISTS public.pull_sheet_substitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_sheet_id uuid NOT NULL REFERENCES public.pull_sheets(id) ON DELETE CASCADE,
  pull_sheet_item_id uuid NOT NULL REFERENCES public.pull_sheet_items(id) ON DELETE CASCADE,
  original_inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  original_item_name text NOT NULL,
  substitute_inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  substitute_item_name text NOT NULL,
  reason text,
  substituted_by text,
  substituted_at timestamptz NOT NULL DEFAULT now(),
  qty_affected numeric NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for pull_sheet_substitutions
CREATE INDEX IF NOT EXISTS idx_pull_sheet_substitutions_pull_sheet_id ON public.pull_sheet_substitutions(pull_sheet_id);
CREATE INDEX IF NOT EXISTS idx_pull_sheet_substitutions_item_id ON public.pull_sheet_substitutions(pull_sheet_item_id);
CREATE INDEX IF NOT EXISTS idx_pull_sheet_substitutions_substituted_at ON public.pull_sheet_substitutions(substituted_at DESC);

-- Add RLS policy for pull_sheet_substitutions
ALTER TABLE public.pull_sheet_substitutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to pull_sheet_substitutions" ON public.pull_sheet_substitutions;
CREATE POLICY "Allow all access to pull_sheet_substitutions" 
  ON public.pull_sheet_substitutions FOR ALL TO public 
  USING (true) WITH CHECK (true);

-- Add comments for pull_sheet_substitutions
COMMENT ON TABLE public.pull_sheet_substitutions IS 'Tracks gear substitutions when original items are unavailable';
COMMENT ON COLUMN public.pull_sheet_substitutions.reason IS 'Reason for substitution (e.g., not available, damaged, customer preference)';

-- Add category and prep_status columns to pull_sheet_items
ALTER TABLE public.pull_sheet_items
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS prep_status text CHECK (prep_status IN ('pending', 'prepped', 'pulled', 'returned'));

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_pull_sheet_items_category ON public.pull_sheet_items(category);

COMMENT ON COLUMN public.pull_sheet_items.category IS 'Equipment category (e.g., Audio, Lighting, Video, Stage, Edison, Misc)';
COMMENT ON COLUMN public.pull_sheet_items.prep_status IS 'Item preparation status: pending, prepped, pulled, returned';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All migrations have been applied successfully.
-- You can now use the new features:
-- - Archive jobs (jobs.archived column)
-- - Transport scheduling (transports table enhanced)
-- - Barcode scanning for pull sheets (pull_sheet_scans table)
-- - Gear substitution tracking (pull_sheet_substitutions table)
