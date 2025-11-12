-- ============================================================================
-- Migration: Add scan tracking and gear substitution to pull sheets
-- Date: 2025-11-12
-- Description: Create tables for tracking barcode scans and gear substitutions
-- ============================================================================

-- ==========================================
-- STEP 1: Create pull_sheet_scans table
-- ==========================================
-- This table tracks all barcode scans for items on pull sheets
CREATE TABLE IF NOT EXISTS public.pull_sheet_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_sheet_id uuid NOT NULL REFERENCES public.pull_sheets(id) ON DELETE CASCADE,
  pull_sheet_item_id uuid REFERENCES public.pull_sheet_items(id) ON DELETE SET NULL,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  barcode text NOT NULL,
  scan_type text NOT NULL CHECK (scan_type IN ('pull', 'return', 'verify')),
  scanned_by text, -- User who performed the scan
  scanned_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pull_sheet_scans_pull_sheet_id ON public.pull_sheet_scans(pull_sheet_id);
CREATE INDEX IF NOT EXISTS idx_pull_sheet_scans_item_id ON public.pull_sheet_scans(pull_sheet_item_id);
CREATE INDEX IF NOT EXISTS idx_pull_sheet_scans_scanned_at ON public.pull_sheet_scans(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_pull_sheet_scans_barcode ON public.pull_sheet_scans(barcode);

-- Add RLS policy
ALTER TABLE public.pull_sheet_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to pull_sheet_scans" 
  ON public.pull_sheet_scans FOR ALL TO public 
  USING (true) WITH CHECK (true);

-- Add comments
COMMENT ON TABLE public.pull_sheet_scans IS 'Tracks all barcode scans for pull sheet items (pull, return, verify)';
COMMENT ON COLUMN public.pull_sheet_scans.scan_type IS 'Type of scan: pull (item pulled from warehouse), return (item returned), verify (verification scan)';

-- ==========================================
-- STEP 2: Create pull_sheet_substitutions table
-- ==========================================
-- This table tracks when gear is substituted (replaced with alternative)
CREATE TABLE IF NOT EXISTS public.pull_sheet_substitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_sheet_id uuid NOT NULL REFERENCES public.pull_sheets(id) ON DELETE CASCADE,
  pull_sheet_item_id uuid NOT NULL REFERENCES public.pull_sheet_items(id) ON DELETE CASCADE,
  original_inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  original_item_name text NOT NULL,
  substitute_inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  substitute_item_name text NOT NULL,
  reason text, -- Why the substitution was made (e.g., "Original not available", "Customer requested")
  substituted_by text, -- User who made the substitution
  substituted_at timestamptz NOT NULL DEFAULT now(),
  qty_affected numeric NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pull_sheet_substitutions_pull_sheet_id ON public.pull_sheet_substitutions(pull_sheet_id);
CREATE INDEX IF NOT EXISTS idx_pull_sheet_substitutions_item_id ON public.pull_sheet_substitutions(pull_sheet_item_id);
CREATE INDEX IF NOT EXISTS idx_pull_sheet_substitutions_substituted_at ON public.pull_sheet_substitutions(substituted_at DESC);

-- Add RLS policy
ALTER TABLE public.pull_sheet_substitutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to pull_sheet_substitutions" 
  ON public.pull_sheet_substitutions FOR ALL TO public 
  USING (true) WITH CHECK (true);

-- Add comments
COMMENT ON TABLE public.pull_sheet_substitutions IS 'Tracks gear substitutions when original items are unavailable';
COMMENT ON COLUMN public.pull_sheet_substitutions.reason IS 'Reason for substitution (e.g., not available, damaged, customer preference)';

-- ==========================================
-- STEP 3: Add category field to pull_sheet_items
-- ==========================================
-- This allows organizing items by category (Audio, Lighting, Video, Stage, etc.)
ALTER TABLE public.pull_sheet_items
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS prep_status text CHECK (prep_status IN ('pending', 'prepped', 'pulled', 'returned'));

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_pull_sheet_items_category ON public.pull_sheet_items(category);

COMMENT ON COLUMN public.pull_sheet_items.category IS 'Equipment category (e.g., Audio, Lighting, Video, Stage, Edison, Misc)';
COMMENT ON COLUMN public.pull_sheet_items.prep_status IS 'Item preparation status: pending, prepped, pulled, returned';
