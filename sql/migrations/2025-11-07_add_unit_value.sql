-- Add unit_value column to inventory_items table
-- This tracks the cost/value per unit of each inventory item

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS unit_value DECIMAL(10,2);

COMMENT ON COLUMN inventory_items.unit_value IS 'Cost/value per unit in dollars';
