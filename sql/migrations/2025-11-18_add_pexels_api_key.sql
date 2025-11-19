-- Add pexels_api_key column to user_profiles table
-- This allows users to configure their Pexels API key through the settings UI

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS pexels_api_key TEXT;

-- Add comment
COMMENT ON COLUMN user_profiles.pexels_api_key IS 'Pexels API key for AI-powered image search in inventory';
