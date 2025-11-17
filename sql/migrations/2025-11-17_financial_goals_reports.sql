-- Create financial_goals_reports table for saving quarterly goal analyses
CREATE TABLE IF NOT EXISTS public.financial_goals_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quarter TEXT NOT NULL, -- Q1, Q2, Q3, Q4
  year INTEGER NOT NULL,
  quarter_target NUMERIC NOT NULL,
  daily_goal NUMERIC NOT NULL,
  weekly_goal NUMERIC NOT NULL,
  analysis TEXT NOT NULL,
  recommendations TEXT[] NOT NULL,
  projected_outcome TEXT NOT NULL,
  metrics_snapshot JSONB, -- Store the financial metrics at time of analysis
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, quarter, year)
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_financial_goals_reports_user_year 
  ON public.financial_goals_reports(user_id, year DESC);

CREATE INDEX IF NOT EXISTS idx_financial_goals_reports_user_quarter 
  ON public.financial_goals_reports(user_id, quarter, year DESC);

-- Enable RLS
ALTER TABLE public.financial_goals_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own reports
CREATE POLICY "Users can view their own financial goals reports"
  ON public.financial_goals_reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can create their own reports
CREATE POLICY "Users can create financial goals reports"
  ON public.financial_goals_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own reports
CREATE POLICY "Users can update their own financial goals reports"
  ON public.financial_goals_reports
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own reports
CREATE POLICY "Users can delete their own financial goals reports"
  ON public.financial_goals_reports
  FOR DELETE
  USING (auth.uid() = user_id);
