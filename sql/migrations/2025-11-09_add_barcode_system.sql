-- Add barcode system for pull sheet items
-- Barcode format: XXX-YYY where XXX = product type, YYY = individual item ID

-- Add product_type_code to inventory_items (first 3 digits)
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS product_type_code TEXT;

-- Add individual_item_code to inventory_items (last 3 digits)
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS individual_item_code TEXT;

-- Add computed full_barcode column helper (or just concatenate in queries)
-- We'll use barcode field to store the full 6-digit code: product_type_code + individual_item_code

-- Create index for faster barcode lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_product_type_code 
ON public.inventory_items(product_type_code);

-- Add scanned_barcode to pull_sheet_items to track what was actually scanned
ALTER TABLE public.pull_sheet_items
ADD COLUMN IF NOT EXISTS scanned_barcode TEXT;

-- Create unique constraint to prevent scanning same barcode twice on same pull sheet
CREATE UNIQUE INDEX IF NOT EXISTS idx_pull_sheet_items_unique_barcode
ON public.pull_sheet_items(pull_sheet_id, scanned_barcode)
WHERE scanned_barcode IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.inventory_items.product_type_code IS 
'First 3 digits of barcode representing product type (e.g., 001 for Speaker Type A)';

COMMENT ON COLUMN public.inventory_items.individual_item_code IS 
'Last 3 digits of barcode representing individual item (e.g., 042 for unit #42)';

COMMENT ON COLUMN public.pull_sheet_items.scanned_barcode IS 
'The 6-digit barcode that was scanned (format: XXXYYY). Prevents duplicate scans on same pull sheet.';
