-- Sync training videos from training_videos table to training_modules for warehouse department
-- This makes videos from /app/training available in /app/training/manage for warehouse assignments

-- Step 1: Add Safety category videos as warehouse-specific training
INSERT INTO public.training_modules (title, description, youtube_id, duration, difficulty, category, department, order_index, is_active)
SELECT 
  tv.title,
  tv.description,
  tv.youtube_video_id,
  CASE 
    WHEN tv.duration_minutes IS NOT NULL THEN tv.duration_minutes || ':00'
    ELSE '30:00'
  END as duration,
  'beginner' as difficulty,
  COALESCE(tv.category, 'Warehouse Operations') as category,
  'warehouse' as department,
  100 + ROW_NUMBER() OVER (ORDER BY tv.display_order, tv.created_at) as order_index,
  true as is_active
FROM public.training_videos tv
WHERE tv.category IN ('Safety', 'safety')
  AND NOT EXISTS (
    SELECT 1 FROM public.training_modules tm
    WHERE tm.youtube_id = tv.youtube_video_id
  );

-- Step 2: Add Basic and Equipment-Specific videos as warehouse training (useful for both departments)
INSERT INTO public.training_modules (title, description, youtube_id, duration, difficulty, category, department, order_index, is_active)
SELECT 
  tv.title,
  tv.description,
  tv.youtube_video_id,
  CASE 
    WHEN tv.duration_minutes IS NOT NULL THEN tv.duration_minutes || ':00'
    ELSE '45:00'
  END as duration,
  CASE 
    WHEN tv.category ILIKE '%advanced%' THEN 'advanced'
    WHEN tv.category ILIKE '%basic%' THEN 'beginner'
    ELSE 'intermediate'
  END as difficulty,
  COALESCE(tv.category, 'Equipment Training') as category,
  'both' as department,
  200 + ROW_NUMBER() OVER (ORDER BY tv.display_order, tv.created_at) as order_index,
  true as is_active
FROM public.training_videos tv
WHERE tv.category IN ('Basic', 'basic', 'Equipment-Specific', 'equipment-specific', 'Advanced', 'advanced')
  AND NOT EXISTS (
    SELECT 1 FROM public.training_modules tm
    WHERE tm.youtube_id = tv.youtube_video_id
  );

-- Step 3: Verify what's now available for warehouse
SELECT 
  category,
  department,
  COUNT(*) as video_count,
  STRING_AGG(title, ', ' ORDER BY order_index) as titles
FROM public.training_modules
WHERE department IN ('warehouse', 'both')
GROUP BY category, department
ORDER BY category, department;

-- Step 4: Show all warehouse training modules
SELECT 
  title,
  category,
  department,
  difficulty,
  duration
FROM public.training_modules
WHERE department IN ('warehouse', 'both')
ORDER BY category, order_index;
