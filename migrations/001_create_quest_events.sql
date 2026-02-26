-- Create quest_events table for event-driven quest tracking
-- This is the single source of truth for all trackable user actions
-- Supports count-based quests (metric_value=1) and amount-based quests (metric_value=amount)

CREATE TABLE IF NOT EXISTS public.quest_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metric_value NUMERIC DEFAULT NULL,
  source TEXT DEFAULT NULL,
  metadata JSONB DEFAULT NULL,
  org_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT event_type_valid CHECK (event_type IN (
    'lead_created',
    'lead_reachout_sent',
    'lead_email_opened',
    'lead_replied_or_engaged',
    'lead_meeting_booked',
    'lead_status_updated',
    'lead_converted_to_client',
    'new_client_this_quarter',
    'job_completed',
    'job_revenue_tracked'
  )),
  CONSTRAINT source_valid CHECK (source IS NULL OR source IN (
    'jobs',
    'inventory',
    'financial',
    'leads',
    'ai',
    'system'
  ))
);

-- Create indexes for common queries
CREATE INDEX idx_quest_events_event_type ON public.quest_events(event_type);
CREATE INDEX idx_quest_events_entity ON public.quest_events(entity_type, entity_id);
CREATE INDEX idx_quest_events_source ON public.quest_events(source);
CREATE INDEX idx_quest_events_created_at ON public.quest_events(created_at);
CREATE INDEX idx_quest_events_org_id ON public.quest_events(org_id);
CREATE INDEX idx_quest_events_lookup ON public.quest_events(
  event_type, 
  created_at DESC
) WHERE org_id IS NOT NULL;

-- RLS: Enable row level security
ALTER TABLE public.quest_events ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view quest events from their organization
CREATE POLICY quest_events_select ON public.quest_events FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    OR org_id = (
      SELECT org_id FROM public.employees 
      WHERE user_id = auth.uid() 
      LIMIT 1
    )
  );

-- RLS: Users can insert quest events for their organization
CREATE POLICY quest_events_insert ON public.quest_events FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      org_id = (
        SELECT org_id FROM public.employees 
        WHERE user_id = auth.uid() 
        LIMIT 1
      )
      OR org_id IS NULL
    )
  );

-- Grant permissions
GRANT SELECT ON public.quest_events TO authenticated;
GRANT INSERT ON public.quest_events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.quest_events_id_seq TO authenticated;
