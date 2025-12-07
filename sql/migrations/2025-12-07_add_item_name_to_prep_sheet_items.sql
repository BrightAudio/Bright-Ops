-- Add item_name column to prep_sheet_items
-- This allows potential items (items without inventory_item_id) to have a name

ALTER TABLE public.prep_sheet_items 
ADD COLUMN IF NOT EXISTS item_name TEXT;

-- Add comment
COMMENT ON COLUMN public.prep_sheet_items.item_name IS 'Item name for potential items that do not have an inventory_item_id';
