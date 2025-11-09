-- Add gear_type field to inventory_items table
-- This allows organizing equipment by category (speakers, mics, cables, lighting, etc.)

-- Add the gear_type column
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS gear_type TEXT;

-- Create an index for faster filtering by gear type
CREATE INDEX IF NOT EXISTS idx_inventory_items_gear_type 
ON public.inventory_items(gear_type);

-- Add a comment to document the column
COMMENT ON COLUMN public.inventory_items.gear_type IS 
'Equipment category (e.g., speakers, microphones, cables, lighting, power, cases, video, audio_processing, rigging, staging, etc.)';

-- You can optionally populate existing items with a default category
-- UPDATE public.inventory_items 
-- SET gear_type = 'uncategorized' 
-- WHERE gear_type IS NULL;
