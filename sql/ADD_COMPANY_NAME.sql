-- Add company_name column to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Update your profile with company name
UPDATE public.user_profiles
SET company_name = 'Bright Audio'
WHERE email = 'brightaudiogroup@gmail.com';

-- Verify the structure and data
SELECT 
  email, 
  full_name, 
  company_name, 
  role, 
  department 
FROM public.user_profiles 
WHERE email = 'brightaudiogroup@gmail.com';
