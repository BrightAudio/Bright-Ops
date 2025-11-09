-- Add rental cost field to inventory items
-- Run this in Supabase SQL Editor

ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS rental_cost_daily DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rental_cost_weekly DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rental_notes TEXT;

-- Create index for searching by rental cost
CREATE INDEX IF NOT EXISTS idx_inventory_rental_cost ON public.inventory_items(rental_cost_daily);

-- Comments for documentation
COMMENT ON COLUMN inventory_items.rental_cost_daily IS 'Daily rental cost for this item in USD';
COMMENT ON COLUMN inventory_items.rental_cost_weekly IS 'Weekly rental cost for this item in USD';
COMMENT ON COLUMN inventory_items.rental_notes IS 'Notes about rental pricing or special conditions';
