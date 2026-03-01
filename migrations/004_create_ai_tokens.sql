-- Create tokens/credits table for AI feature usage tracking
CREATE TABLE IF NOT EXISTS public.ai_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  token_type TEXT NOT NULL CHECK (token_type IN ('lead_generation', 'goal_generation', 'strategy_analysis', 'forecast', 'general')),
  balance INTEGER NOT NULL DEFAULT 0,
  total_allocated INTEGER NOT NULL DEFAULT 0,
  total_used INTEGER NOT NULL DEFAULT 0,
  refresh_date TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT fk_organization_id FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT unique_org_token_type UNIQUE(organization_id, token_type)
);

-- Create token usage log for audit trail
CREATE TABLE IF NOT EXISTS public.ai_token_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  token_type TEXT NOT NULL,
  feature_used TEXT NOT NULL, -- e.g., 'generate_leads', 'analyze_strategy', 'forecast_revenue'
  tokens_deducted INTEGER NOT NULL,
  remaining_balance INTEGER NOT NULL,
  metadata JSONB, -- Store context like lead_count, goal_target, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT fk_organization_id FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index for faster queries
CREATE INDEX idx_ai_tokens_organization_id ON public.ai_tokens(organization_id);
CREATE INDEX idx_ai_tokens_token_type ON public.ai_tokens(token_type);
CREATE INDEX idx_ai_token_usage_organization ON public.ai_token_usage_log(organization_id);
CREATE INDEX idx_ai_token_usage_user ON public.ai_token_usage_log(user_id);
CREATE INDEX idx_ai_token_usage_feature ON public.ai_token_usage_log(feature_used);

-- Enable RLS
ALTER TABLE public.ai_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_token_usage_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_tokens
CREATE POLICY "Allow organization members to view their tokens"
  ON public.ai_tokens FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Allow system to update tokens"
  ON public.ai_tokens FOR UPDATE
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

-- RLS policies for token usage log
CREATE POLICY "Allow organization members to view their usage"
  ON public.ai_token_usage_log FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Allow system to log usage"
  ON public.ai_token_usage_log FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE public.ai_tokens IS 'Tracks AI token balance per organization and token type with tier-based limits';
COMMENT ON TABLE public.ai_token_usage_log IS 'Audit trail of AI token usage for compliance and reporting';
COMMENT ON COLUMN public.ai_tokens.balance IS 'Current available tokens for immediate use';
COMMENT ON COLUMN public.ai_tokens.total_allocated IS 'Total tokens allocated this period based on tier';
COMMENT ON COLUMN public.ai_tokens.total_used IS 'Total tokens consumed this period';
COMMENT ON COLUMN public.ai_tokens.refresh_date IS 'When tokens are refreshed (monthly or quarterly)';
