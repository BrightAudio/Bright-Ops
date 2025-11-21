-- Add Twilio SMS settings to leads_settings table
-- Migration: 2025-11-20_add_twilio_settings.sql

-- Add Twilio columns and default_calling_app to leads_settings
ALTER TABLE leads_settings 
ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT,
ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT,
ADD COLUMN IF NOT EXISTS twilio_messaging_service_sid TEXT,
ADD COLUMN IF NOT EXISTS default_calling_app TEXT DEFAULT 'ask';

-- Add comments
COMMENT ON COLUMN leads_settings.twilio_account_sid IS 'Twilio Account SID for SMS functionality';
COMMENT ON COLUMN leads_settings.twilio_auth_token IS 'Twilio Auth Token (keep secret)';
COMMENT ON COLUMN leads_settings.twilio_messaging_service_sid IS 'Twilio Messaging Service SID (starts with MG)';
COMMENT ON COLUMN leads_settings.default_calling_app IS 'Default calling application preference: ask, homebase, or other';
