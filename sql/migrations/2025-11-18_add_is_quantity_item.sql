-- Add is_quantity_item flag to inventory_items table
-- Run this in Supabase SQL Editor

-- Add column (default to FALSE for serialized tracking)
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS is_quantity_item BOOLEAN DEFAULT FALSE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_quantity_item 
  ON public.inventory_items(is_quantity_item);

-- Add comment explaining the field
COMMENT ON COLUMN public.inventory_items.is_quantity_item IS 
  'TRUE for quantity-counted items (cables, adapters, etc.) where multiple units share one line. FALSE for serialized items (speakers, lights) where each unit gets its own line.';

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inventory_items'
  AND column_name = 'is_quantity_item';
