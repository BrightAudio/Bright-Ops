-- Add is_quantity_item column to inventory_items table
-- This flag indicates whether an item can be added multiple times to pull sheets
-- Quantity items (cables, adapters) = true
-- Unique items (speakers, barcoded gear) = false

ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS is_quantity_item BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.inventory_items.is_quantity_item IS 'True for quantity items (cables, adapters) that can be added multiple times to pull sheets. False for unique barcoded items like speakers.';
