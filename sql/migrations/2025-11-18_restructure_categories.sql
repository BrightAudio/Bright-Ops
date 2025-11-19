-- Restructure inventory categories
-- Current 'category' field becomes 'subcategory'
-- Add new 'category' field for main categories (Audio, Stage, Lights, etc.)

-- Step 1: Rename existing category column to subcategory
ALTER TABLE public.inventory_items 
  RENAME COLUMN category TO subcategory;

-- Step 2: Add new category column for main categories
ALTER TABLE public.inventory_items
  ADD COLUMN category TEXT;

-- Step 3: Set default categories based on subcategory values
UPDATE public.inventory_items
SET category = CASE
  -- Audio categories
  WHEN subcategory IN ('monitor_wedges', 'tops', 'subs', 'column_speakers') THEN 'Audio'
  WHEN subcategory = 'amps' OR subcategory = 'amprack' THEN 'Audio'
  
  -- Lighting categories
  WHEN subcategory IN ('lights', 'uplights') THEN 'Lights'
  
  -- Stage/Decking
  WHEN subcategory = 'road_cases' THEN 'Stage'
  
  -- Field Audio
  WHEN subcategory = 'field_audio' THEN 'Field Audio'
  
  -- Video
  WHEN subcategory LIKE '%video%' OR subcategory LIKE '%screen%' OR subcategory LIKE '%projector%' THEN 'Video'
  
  -- Default to Misc for anything else
  ELSE 'Misc'
END
WHERE category IS NULL;

-- Step 4: Make category NOT NULL and set default
ALTER TABLE public.inventory_items
  ALTER COLUMN category SET DEFAULT 'Misc',
  ALTER COLUMN category SET NOT NULL;

-- Step 5: Create index on new category column
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category);

-- Step 6: Update existing index name for subcategory
DROP INDEX IF EXISTS idx_inventory_category;
CREATE INDEX IF NOT EXISTS idx_inventory_subcategory ON public.inventory_items(subcategory);

-- Verify the changes
SELECT 
  category,
  subcategory,
  COUNT(*) as item_count
FROM public.inventory_items
GROUP BY category, subcategory
ORDER BY category, subcategory;
