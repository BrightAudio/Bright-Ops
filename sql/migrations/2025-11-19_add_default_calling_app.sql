-- Add default_calling_app column to leads_settings table
ALTER TABLE leads_settings 
ADD COLUMN IF NOT EXISTS default_calling_app TEXT DEFAULT 'ask';

-- Add comment to explain the column
COMMENT ON COLUMN leads_settings.default_calling_app IS 'Default calling app preference: ask, tel, teams, skype, zoom, google-voice, or copy';
