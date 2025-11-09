-- Create function to increment inventory usage tracking
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION increment_inventory_usage(
  item_id UUID,
  jobs_used INTEGER DEFAULT 1,
  amort_amount DECIMAL(10,2) DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  UPDATE inventory_items
  SET 
    total_jobs_used = COALESCE(total_jobs_used, 0) + jobs_used,
    accumulated_amortization = COALESCE(accumulated_amortization, 0) + amort_amount,
    updated_at = NOW()
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_inventory_usage(UUID, INTEGER, DECIMAL) TO PUBLIC;

COMMENT ON FUNCTION increment_inventory_usage IS 'Increments usage tracking for inventory items when used on jobs';
