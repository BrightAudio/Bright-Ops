-- Add Vonage SMS settings columns to leads_settings table
-- Migration: 2025-11-22_add_vonage_settings.sql

-- Add Vonage columns
ALTER TABLE leads_settings
ADD COLUMN IF NOT EXISTS vonage_api_key TEXT,
ADD COLUMN IF NOT EXISTS vonage_api_secret TEXT,
ADD COLUMN IF NOT EXISTS vonage_from_number TEXT;

-- Drop old Twilio columns
ALTER TABLE leads_settings
DROP COLUMN IF EXISTS twilio_account_sid,
DROP COLUMN IF EXISTS twilio_auth_token,
DROP COLUMN IF EXISTS twilio_messaging_service_sid;

COMMENT ON COLUMN leads_settings.vonage_api_key IS 'Vonage API Key for SMS sending';
COMMENT ON COLUMN leads_settings.vonage_api_secret IS 'Vonage API Secret (keep secure)';
COMMENT ON COLUMN leads_settings.vonage_from_number IS 'Vonage phone number or sender ID (no + or dashes)';
