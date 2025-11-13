-- Bright Leads Portal - Database Schema
-- Creates the leads table for tracking potential clients and outreach

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);

-- Create index on org for filtering by organization
CREATE INDEX IF NOT EXISTS idx_leads_org ON public.leads(org);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage leads
CREATE POLICY "Authenticated users can manage leads"
    ON public.leads
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.leads IS 'Stores potential client leads for Bright Audio outreach automation';
