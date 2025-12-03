-- Update training modules to support warehouse department
-- This makes training available to warehouse associates when assigning in /app/training/manage

-- Step 1: Update Customer Service modules to be available for both departments
-- These are relevant for warehouse staff who interact with clients
UPDATE public.training_modules
SET department = 'both'
WHERE category = 'Customer Service';

-- Step 2: Add warehouse-specific training categories if they don't exist
-- You can add more warehouse-specific modules here following this pattern:
-- INSERT INTO public.training_modules (title, description, youtube_id, duration, difficulty, category, department, order_index) VALUES
-- ('Warehouse Safety Training', 'Essential safety procedures for warehouse operations', 'YOUTUBE_ID', '30:00', 'beginner', 'Warehouse Operations', 'warehouse', 100);

-- Step 3: Verify the changes - Show all modules available to warehouse
SELECT 
  title,
  category,
  department,
  difficulty,
  duration,
  order_index
FROM public.training_modules
WHERE department IN ('warehouse', 'both')
ORDER BY category, order_index;

-- Step 4: Show summary by category
SELECT 
  category,
  department,
  COUNT(*) as module_count
FROM public.training_modules
WHERE department IN ('warehouse', 'both')
GROUP BY category, department
ORDER BY category, department;
