-- Clean campaigns migration
-- Drop existing policies first to avoid conflicts

DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Authenticated users can create campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Authenticated users can update campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Authenticated users can delete campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Authenticated users can view campaign recipients" ON public.campaign_recipients;
DROP POLICY IF EXISTS "Authenticated users can manage campaign recipients" ON public.campaign_recipients;

-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Campaign Details
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_template TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused')),
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Target Audience
  target_status TEXT,
  target_tags TEXT[],
  
  -- Stats
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaign_recipients junction table
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  email_id UUID REFERENCES public.leads_emails(id) ON DELETE SET NULL,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(campaign_id, lead_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON public.campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON public.campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_lead ON public.campaign_recipients(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON public.campaign_recipients(status);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
CREATE POLICY "Authenticated users can view campaigns"
  ON public.campaigns FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create campaigns"
  ON public.campaigns FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update campaigns"
  ON public.campaigns FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete campaigns"
  ON public.campaigns FOR DELETE TO authenticated USING (true);

-- RLS Policies for campaign_recipients
CREATE POLICY "Authenticated users can view campaign recipients"
  ON public.campaign_recipients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage campaign recipients"
  ON public.campaign_recipients FOR ALL TO authenticated USING (true) WITH CHECK (true);
