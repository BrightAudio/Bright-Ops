-- Populate Gear Types for Existing Inventory Items
-- Run these queries in Supabase SQL Editor AFTER running the migration

-- This file provides examples for categorizing your existing inventory.
-- Customize the patterns to match your actual item naming conventions.

-- ============================================================================
-- SPEAKERS
-- ============================================================================
UPDATE inventory_items 
SET gear_type = 'speakers' 
WHERE gear_type IS NULL 
AND (
  name ILIKE '%speaker%' OR
  name ILIKE '%QSC%' OR
  name ILIKE '%JBL%' OR
  name ILIKE '%EV%' OR
  name ILIKE '%EKX%' OR
  name ILIKE '%PRX%' OR
  name ILIKE '%K12%' OR
  name ILIKE '%K10%' OR
  name ILIKE '%sub%' OR
  name ILIKE '%subwoofer%'
);

-- ============================================================================
-- MICROPHONES
-- ============================================================================
UPDATE inventory_items 
SET gear_type = 'microphones' 
WHERE gear_type IS NULL 
AND (
  name ILIKE '%mic%' OR
  name ILIKE '%microphone%' OR
  name ILIKE '%SM58%' OR
  name ILIKE '%SM57%' OR
  name ILIKE '%Beta%' OR
  name ILIKE '%Shure%' OR
  name ILIKE '%Sennheiser%' OR
  name ILIKE '%wireless%'
);

-- ============================================================================
-- CABLES
-- ============================================================================
UPDATE inventory_items 
SET gear_type = 'cables' 
WHERE gear_type IS NULL 
AND (
  name ILIKE '%cable%' OR
  name ILIKE '%XLR%' OR
  name ILIKE '%TRS%' OR
  name ILIKE '%speakon%' OR
  name ILIKE '%dmx%' OR
  name ILIKE '%ethernet%' OR
  name ILIKE '%power cable%' OR
  name ILIKE '%extension%'
);

-- ============================================================================
-- LIGHTING
-- ============================================================================
UPDATE inventory_items 
SET gear_type = 'lighting' 
WHERE gear_type IS NULL 
AND (
  name ILIKE '%light%' OR
  name ILIKE '%LED%' OR
  name ILIKE '%PAR%' OR
  name ILIKE '%wash%' OR
  name ILIKE '%spot%' OR
  name ILIKE '%moving head%' OR
  name ILIKE '%fixture%' OR
  name ILIKE '%chauvet%' OR
  name ILIKE '%martin%'
);

-- ============================================================================
-- POWER
-- ============================================================================
UPDATE inventory_items 
SET gear_type = 'power' 
WHERE gear_type IS NULL 
AND (
  name ILIKE '%distro%' OR
  name ILIKE '%power distro%' OR
  name ILIKE '%PDU%' OR
  name ILIKE '%power strip%' OR
  name ILIKE '%Edison%' OR
  name ILIKE '%cam%lock%' OR
  name ILIKE '%generator%' OR
  name ILIKE '%UPS%'
);

-- ============================================================================
-- CASES
-- ============================================================================
UPDATE inventory_items 
SET gear_type = 'cases' 
WHERE gear_type IS NULL 
AND (
  name ILIKE '%case%' OR
  name ILIKE '%road case%' OR
  name ILIKE '%rack%' OR
  name ILIKE '%gator%' OR
  name ILIKE '%SKB%' OR
  name ILIKE '%pelican%' OR
  name ILIKE '%flight case%'
);

-- ============================================================================
-- VIDEO
-- ============================================================================
UPDATE inventory_items 
SET gear_type = 'video' 
WHERE gear_type IS NULL 
AND (
  name ILIKE '%screen%' OR
  name ILIKE '%projector%' OR
  name ILIKE '%monitor%' OR
  name ILIKE '%TV%' OR
  name ILIKE '%display%' OR
  name ILIKE '%HDMI%' OR
  name ILIKE '%camera%' OR
  name ILIKE '%LED wall%' OR
  name ILIKE '%video%'
);

-- ============================================================================
-- AUDIO PROCESSING
-- ============================================================================
UPDATE inventory_items 
SET gear_type = 'audio_processing' 
WHERE gear_type IS NULL 
AND (
  name ILIKE '%mixer%' OR
  name ILIKE '%console%' OR
  name ILIKE '%amplifier%' OR
  name ILIKE '%amp%' OR
  name ILIKE '%processor%' OR
  name ILIKE '%compressor%' OR
  name ILIKE '%EQ%' OR
  name ILIKE '%DSP%' OR
  name ILIKE '%X32%' OR
  name ILIKE '%M32%' OR
  name ILIKE '%CL5%' OR
  name ILIKE '%LS9%'
);

-- ============================================================================
-- RIGGING
-- ============================================================================
UPDATE inventory_items 
SET gear_type = 'rigging' 
WHERE gear_type IS NULL 
AND (
  name ILIKE '%truss%' OR
  name ILIKE '%rigging%' OR
  name ILIKE '%chain%' OR
  name ILIKE '%hoist%' OR
  name ILIKE '%motor%' OR
  name ILIKE '%shackle%' OR
  name ILIKE '%clamp%' OR
  name ILIKE '%safety%'
);

-- ============================================================================
-- STAGING
-- ============================================================================
UPDATE inventory_items 
SET gear_type = 'staging' 
WHERE gear_type IS NULL 
AND (
  name ILIKE '%stage%' OR
  name ILIKE '%deck%' OR
  name ILIKE '%platform%' OR
  name ILIKE '%riser%' OR
  name ILIKE '%barrier%' OR
  name ILIKE '%rail%'
);

-- ============================================================================
-- OTHER (catch-all for items not yet categorized)
-- ============================================================================
UPDATE inventory_items 
SET gear_type = 'other' 
WHERE gear_type IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count items per gear type
SELECT 
  gear_type, 
  COUNT(*) as item_count 
FROM inventory_items 
GROUP BY gear_type 
ORDER BY item_count DESC;

-- Show uncategorized items (should be 0 after running above)
SELECT id, name, barcode 
FROM inventory_items 
WHERE gear_type IS NULL 
LIMIT 50;

-- Show sample items from each category (first 3 items per category)
SELECT 
  gear_type,
  COUNT(*) as total,
  (
    SELECT STRING_AGG(name, ', ')
    FROM (
      SELECT name 
      FROM inventory_items i2 
      WHERE i2.gear_type = inventory_items.gear_type 
      ORDER BY name 
      LIMIT 3
    ) AS sample
  ) as sample_items
FROM inventory_items
GROUP BY gear_type
ORDER BY total DESC;

-- ============================================================================
-- MANUAL ASSIGNMENT (if needed)
-- ============================================================================

-- If you need to manually assign specific items:
-- UPDATE inventory_items SET gear_type = 'speakers' WHERE id = 'uuid-here';
-- UPDATE inventory_items SET gear_type = 'microphones' WHERE name = 'Specific Item Name';

-- Batch update by barcode pattern:
-- UPDATE inventory_items SET gear_type = 'cables' WHERE barcode LIKE 'CBL-%';
