-- QUERY 1: Create Leads Table (Safe Version - Handles Existing Objects)

-- Drop existing trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;

-- Create or update leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    org TEXT,
    title TEXT,
    snippet TEXT,
    status TEXT DEFAULT 'uncontacted' CHECK (status IN ('uncontacted', 'contacted', 'follow-up', 'interested', 'converted', 'archived')),
    generated_subject TEXT,
    generated_body TEXT,
    last_contacted TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    phone TEXT,
    website TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if they don't exist
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS website TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_org ON public.leads(org);

-- Enable RLS if not already enabled
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Authenticated users can manage leads" ON public.leads;

-- Recreate policy
CREATE POLICY "Authenticated users can manage leads"
    ON public.leads
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create or replace function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
