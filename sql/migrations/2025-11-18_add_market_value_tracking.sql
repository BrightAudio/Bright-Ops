-- Add market value tracking columns to inventory_items
-- Allows storing current market prices found via web search

ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS market_value NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS market_source VARCHAR(255),
ADD COLUMN IF NOT EXISTS market_lookup_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS price_history JSONB DEFAULT '[]'::jsonb;

-- Create index for quick lookups by market lookup date
CREATE INDEX IF NOT EXISTS idx_inventory_items_market_lookup_date 
ON public.inventory_items(market_lookup_date DESC NULLS LAST);

-- Create index for items that need market valuation
CREATE INDEX IF NOT EXISTS idx_inventory_items_needs_market_value 
ON public.inventory_items(id) WHERE market_lookup_date IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.inventory_items.market_value IS 'Current market value found via web search (Reverb.com, Sweetwater.com, etc.)';
COMMENT ON COLUMN public.inventory_items.market_source IS 'Source where market value was found (e.g., "Reverb.com", "Sweetwater.com")';
COMMENT ON COLUMN public.inventory_items.market_lookup_date IS 'Date when market value was last searched/updated';
COMMENT ON COLUMN public.inventory_items.price_history IS 'JSON array of {price, source, date} objects tracking price changes over time';
