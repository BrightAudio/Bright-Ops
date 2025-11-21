-- Add Stripe API key fields to leads_settings table
ALTER TABLE leads_settings
ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT;

-- Add comment for documentation
COMMENT ON COLUMN leads_settings.stripe_publishable_key IS 'Stripe publishable key for equipment financing (pk_test_ or pk_live_)';
COMMENT ON COLUMN leads_settings.stripe_secret_key IS 'Stripe secret key for equipment financing (sk_test_ or sk_live_)';
