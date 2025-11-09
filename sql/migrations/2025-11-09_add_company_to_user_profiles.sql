-- Add company_name to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Optional: Set a default for existing users
-- UPDATE user_profiles SET company_name = 'Bright Audio' WHERE company_name IS NULL;
