-- Create quests table for persistent quest storage
CREATE TABLE IF NOT EXISTS public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  quarter TEXT NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  target_amount NUMERIC(10, 2) NOT NULL,
  current_progress NUMERIC(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'archived')),
  quest_type TEXT NOT NULL DEFAULT 'quarterly_revenue',
  metadata JSONB, -- Store additional quest data (rewards, steps, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT fk_organization_id FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- Index for faster queries
CREATE INDEX idx_quests_organization_id ON public.quests(organization_id);
CREATE INDEX idx_quests_quarter ON public.quests(quarter);
CREATE INDEX idx_quests_status ON public.quests(status);
CREATE INDEX idx_quests_organization_status ON public.quests(organization_id, status);

-- Enable RLS
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow organization members to view their quests" ON public.quests;
DROP POLICY IF EXISTS "Allow organization members to create quests" ON public.quests;
DROP POLICY IF EXISTS "Allow organization members to update quests" ON public.quests;
DROP POLICY IF EXISTS "Allow organization members to delete quests" ON public.quests;

-- RLS policies: Allow authenticated users to manage quests for their organization
CREATE POLICY "Allow organization members to view their quests"
  ON public.quests FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Allow organization members to create quests"
  ON public.quests FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Allow organization members to update quests"
  ON public.quests FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Allow organization members to delete quests"
  ON public.quests FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE public.quests IS 'Stores persistent quest data for organizations';
COMMENT ON COLUMN public.quests.metadata IS 'JSONB field storing quest steps, rewards, and other dynamic data';
