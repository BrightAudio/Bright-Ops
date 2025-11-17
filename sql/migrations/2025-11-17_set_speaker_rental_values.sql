-- Set speaker rental values based on category and brand
-- Powered/Active speakers and monitors: $75 per speaker
-- Tops and subs: $100 per speaker
-- L Acoustics brand speakers: $150 per speaker

-- Update powered/active speakers and monitors to $75/day
UPDATE inventory_items
SET rental_cost_daily = 75
WHERE category = 'speakers'
  AND (
    name ILIKE '%powered%'
    OR name ILIKE '%active%'
    OR name ILIKE '%monitor%'
  )
  AND name NOT ILIKE '%l acoustics%'
  AND name NOT ILIKE '%la%'
  AND name NOT ILIKE '%la8%'
  AND name NOT ILIKE '%la12%'
  AND name NOT ILIKE '%kyara%'
  AND name NOT ILIKE '%kara%';

-- Update tops and subs to $100/day
UPDATE inventory_items
SET rental_cost_daily = 100
WHERE category = 'speakers'
  AND (
    name ILIKE '%top%'
    OR name ILIKE '%sub%'
    OR name ILIKE '%subwoofer%'
    OR name ILIKE '%bass%'
  )
  AND name NOT ILIKE '%l acoustics%'
  AND name NOT ILIKE '%la%'
  AND name NOT ILIKE '%la8%'
  AND name NOT ILIKE '%la12%'
  AND name NOT ILIKE '%kyara%'
  AND name NOT ILIKE '%kara%';

-- Update L Acoustics brand speakers to $150/day (highest priority)
UPDATE inventory_items
SET rental_cost_daily = 150
WHERE category = 'speakers'
  AND (
    name ILIKE '%l acoustics%'
    OR name ILIKE '%la%'
    OR name ILIKE '%kyara%'
    OR name ILIKE '%kara%'
  );

-- Set weekly rental rates as 5x the daily rate
UPDATE inventory_items
SET rental_cost_weekly = rental_cost_daily * 5
WHERE category = 'speakers'
  AND (rental_cost_daily = 75 OR rental_cost_daily = 100 OR rental_cost_daily = 150);
