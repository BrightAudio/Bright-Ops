-- Create leads_settings table for storing API keys and email configuration
CREATE TABLE IF NOT EXISTS public.leads_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- API Keys
  openai_api_key TEXT,
  sendgrid_api_key TEXT,
  google_api_key TEXT,
  google_search_engine_id TEXT,
  
  -- Email Settings
  email_from_name TEXT DEFAULT 'Bright Ops',
  email_from_address TEXT,
  email_reply_to TEXT,
  
  -- AI Settings
  ai_tone TEXT DEFAULT 'professional',
  ai_template TEXT DEFAULT 'introduction',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create leads_emails table for email tracking
CREATE TABLE IF NOT EXISTS public.leads_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  
  -- Email Details
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  
  -- SendGrid Info
  sendgrid_message_id TEXT,
  
  -- Status Tracking
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Metadata
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_emails_lead_id ON public.leads_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_emails_sent_at ON public.leads_emails(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_emails_status ON public.leads_emails(status);
CREATE INDEX IF NOT EXISTS idx_leads_emails_recipient ON public.leads_emails(recipient_email);

-- Enable RLS
ALTER TABLE public.leads_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads_settings (only authenticated users can read/update)
CREATE POLICY "Authenticated users can view settings"
  ON public.leads_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert settings"
  ON public.leads_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update settings"
  ON public.leads_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for leads_emails (authenticated users can view and create)
CREATE POLICY "Authenticated users can view emails"
  ON public.leads_emails
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert emails"
  ON public.leads_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default settings row if none exists
INSERT INTO public.leads_settings (email_from_name, email_from_address, ai_tone, ai_template)
VALUES ('Bright Ops', 'noreply@brightops.com', 'professional', 'introduction')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.leads_settings IS 'Stores API keys and configuration for the Leads portal';
COMMENT ON TABLE public.leads_emails IS 'Tracks all emails sent from the Leads portal with delivery status';
