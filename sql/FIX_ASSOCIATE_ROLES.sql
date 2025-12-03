-- Check what users exist and their roles
SELECT id, email, full_name, role, department 
FROM public.user_profiles 
ORDER BY email;

-- Add Gary Clements as associate
INSERT INTO public.user_profiles (id, email, full_name, role, department)
VALUES (
  'f1968eae-31d8-4d3e-8378-851d3dee6754',
  'gtclements1993@gmail.com',
  'Gary Clements',
  'associate',
  'both'
)
ON CONFLICT (id) DO UPDATE 
SET role = 'associate', 
    department = 'both',
    full_name = 'Gary Clements';

-- If you see users but they're all 'manager' or null roles, run this:
-- (Uncomment the lines below after checking the results above)

/*
-- Update specific users to be associates (replace emails with actual emails)
UPDATE public.user_profiles 
SET role = 'associate', department = 'leads'
WHERE email IN (
  'associate1@example.com',
  'associate2@example.com',
  'associate3@example.com'
);

-- OR make ALL users except managers into associates:
UPDATE public.user_profiles 
SET role = 'associate', department = 'both'
WHERE role != 'manager';
*/
