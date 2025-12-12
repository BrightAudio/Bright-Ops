-- ============================================
-- ADD BUSINESS PIN AND SECRET ID TO ORGANIZATIONS
-- This enables multiple users to join the same organization using a shared PIN
-- ============================================

-- Add new columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS business_pin TEXT,
ADD COLUMN IF NOT EXISTS secret_id UUID DEFAULT gen_random_uuid();

-- Create unique index on secret_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_secret_id ON public.organizations(secret_id);

-- Create index on business_pin for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_business_pin ON public.organizations(business_pin);

-- Create composite index for name + PIN matching
CREATE INDEX IF NOT EXISTS idx_organizations_name_pin ON public.organizations(LOWER(name), business_pin);

COMMENT ON COLUMN public.organizations.business_pin IS 'Shared PIN that allows users to join this organization';
COMMENT ON COLUMN public.organizations.secret_id IS 'Unique secret identifier for the organization';

-- Update existing organizations to have a secret_id if they don't already
UPDATE public.organizations 
SET secret_id = gen_random_uuid() 
WHERE secret_id IS NULL;

-- Make secret_id NOT NULL after populating existing rows
ALTER TABLE public.organizations 
ALTER COLUMN secret_id SET NOT NULL;
