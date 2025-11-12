-- ============================================================================
-- Migration: Enhanced pull sheet scanning with unit tracking
-- Date: 2025-11-12
-- Description: Track individual inventory units scanned to prevent duplicates
-- ============================================================================

-- Add a table to track which specific inventory units have been scanned for each pull sheet item
CREATE TABLE IF NOT EXISTS public.pull_sheet_item_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_sheet_id uuid NOT NULL REFERENCES public.pull_sheets(id) ON DELETE CASCADE,
  pull_sheet_item_id uuid NOT NULL REFERENCES public.pull_sheet_items(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  barcode text NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  scanned_by text,
  scan_status text NOT NULL DEFAULT 'active' CHECK (scan_status IN ('active', 'returned', 'void')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent same barcode being scanned twice for same pull sheet item (while active)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pull_sheet_item_scans_unique_active 
  ON public.pull_sheet_item_scans(pull_sheet_item_id, barcode) 
  WHERE scan_status = 'active';

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pull_sheet_item_scans_pull_sheet_id 
  ON public.pull_sheet_item_scans(pull_sheet_id);
CREATE INDEX IF NOT EXISTS idx_pull_sheet_item_scans_item_id 
  ON public.pull_sheet_item_scans(pull_sheet_item_id);
CREATE INDEX IF NOT EXISTS idx_pull_sheet_item_scans_barcode 
  ON public.pull_sheet_item_scans(barcode);

-- RLS Policy
ALTER TABLE public.pull_sheet_item_scans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to pull_sheet_item_scans" ON public.pull_sheet_item_scans;
CREATE POLICY "Allow all access to pull_sheet_item_scans" 
  ON public.pull_sheet_item_scans FOR ALL TO public 
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.pull_sheet_item_scans IS 'Tracks individual inventory units scanned for each pull sheet item to prevent duplicates';
COMMENT ON COLUMN public.pull_sheet_item_scans.scan_status IS 'active = currently pulled, returned = item returned, void = scan cancelled';

-- Add qty_fulfilled column to pull_sheet_items to track scan progress
ALTER TABLE public.pull_sheet_items
  ADD COLUMN IF NOT EXISTS qty_fulfilled numeric DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.pull_sheet_items.qty_fulfilled IS 'Number of units actually scanned/fulfilled (0/4, 1/4, etc.)';

-- Function to automatically update qty_fulfilled when items are scanned
CREATE OR REPLACE FUNCTION update_pull_sheet_item_fulfilled()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the qty_fulfilled count based on active scans
  UPDATE public.pull_sheet_items
  SET qty_fulfilled = (
    SELECT COUNT(*)
    FROM public.pull_sheet_item_scans
    WHERE pull_sheet_item_id = NEW.pull_sheet_item_id
      AND scan_status = 'active'
  )
  WHERE id = NEW.pull_sheet_item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update qty_fulfilled on insert/update
DROP TRIGGER IF EXISTS trigger_update_fulfilled_on_scan ON public.pull_sheet_item_scans;
CREATE TRIGGER trigger_update_fulfilled_on_scan
  AFTER INSERT OR UPDATE ON public.pull_sheet_item_scans
  FOR EACH ROW
  EXECUTE FUNCTION update_pull_sheet_item_fulfilled();
