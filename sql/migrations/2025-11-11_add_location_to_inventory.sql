-- Add location column to inventory_items table
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'NEW SOUND Warehouse';

-- Add comment to explain the column
COMMENT ON COLUMN inventory_items.location IS 'Stock location where the item is stored (e.g., NEW SOUND Warehouse, Bright Audio Warehouse)';

-- Create index for faster filtering by location
CREATE INDEX IF NOT EXISTS idx_inventory_items_location ON inventory_items(location);
