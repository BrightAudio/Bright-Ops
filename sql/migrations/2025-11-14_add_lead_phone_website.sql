-- Add additional fields to leads table for Google search results
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS website TEXT;
