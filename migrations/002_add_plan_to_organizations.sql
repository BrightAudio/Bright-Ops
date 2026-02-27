-- Add plan column to organizations table for tier gating
-- Supports starter, pro, and enterprise tiers

ALTER TABLE public.organizations 
ADD COLUMN plan TEXT DEFAULT 'starter' 
CHECK (plan IN ('starter', 'pro', 'enterprise'));

-- Create index for tier-based queries
CREATE INDEX idx_organizations_plan ON public.organizations(plan);
