-- Check current user profiles to see if full_name is set
SELECT 
  id,
  email,
  full_name,
  role,
  department,
  created_at
FROM public.user_profiles
ORDER BY created_at DESC;

-- Update your profile with your actual name
UPDATE public.user_profiles
SET full_name = 'Stephen Bright'
WHERE email = 'brightaudiogroup@gmail.com';

-- Verify the update
SELECT email, full_name, role, department FROM public.user_profiles WHERE email = 'brightaudiogroup@gmail.com';
