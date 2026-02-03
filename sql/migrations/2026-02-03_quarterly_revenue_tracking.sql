-- ============================================
-- QUARTERLY REVENUE TRACKING SYSTEM
-- Tracks quarterly revenue and historical yearly data
-- ============================================

-- Create quarterly_revenue table to store snapshot data for each quarter
CREATE TABLE IF NOT EXISTS public.quarterly_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL, -- 1, 2, 3, or 4
  total_revenue NUMERIC(12, 2) DEFAULT 0,
  total_expenses NUMERIC(12, 2) DEFAULT 0,
  total_profit NUMERIC(12, 2) DEFAULT 0,
  job_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, year, quarter)
);

-- Create yearly_revenue table to store annual summaries
CREATE TABLE IF NOT EXISTS public.yearly_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  q1_revenue NUMERIC(12, 2) DEFAULT 0,
  q2_revenue NUMERIC(12, 2) DEFAULT 0,
  q3_revenue NUMERIC(12, 2) DEFAULT 0,
  q4_revenue NUMERIC(12, 2) DEFAULT 0,
  total_revenue NUMERIC(12, 2) DEFAULT 0,
  total_expenses NUMERIC(12, 2) DEFAULT 0,
  total_profit NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, year)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quarterly_revenue_org_year ON public.quarterly_revenue(organization_id, year);
CREATE INDEX IF NOT EXISTS idx_quarterly_revenue_org_quarter ON public.quarterly_revenue(organization_id, year, quarter);
CREATE INDEX IF NOT EXISTS idx_yearly_revenue_org_year ON public.yearly_revenue(organization_id, year);

-- Enable RLS
ALTER TABLE public.quarterly_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearly_revenue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quarterly_revenue
DROP POLICY IF EXISTS "Users can view quarterly revenue for their organization" ON public.quarterly_revenue;
CREATE POLICY "Users can view quarterly revenue for their organization"
  ON public.quarterly_revenue
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert quarterly revenue for their organization" ON public.quarterly_revenue;
CREATE POLICY "Users can insert quarterly revenue for their organization"
  ON public.quarterly_revenue
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update quarterly revenue for their organization" ON public.quarterly_revenue;
CREATE POLICY "Users can update quarterly revenue for their organization"
  ON public.quarterly_revenue
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for yearly_revenue
DROP POLICY IF EXISTS "Users can view yearly revenue for their organization" ON public.yearly_revenue;
CREATE POLICY "Users can view yearly revenue for their organization"
  ON public.yearly_revenue
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert yearly revenue for their organization" ON public.yearly_revenue;
CREATE POLICY "Users can insert yearly revenue for their organization"
  ON public.yearly_revenue
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update yearly revenue for their organization" ON public.yearly_revenue;
CREATE POLICY "Users can update yearly revenue for their organization"
  ON public.yearly_revenue
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Function to calculate quarter from date
CREATE OR REPLACE FUNCTION public.get_quarter(date_val TIMESTAMPTZ)
RETURNS INTEGER AS $$
BEGIN
  RETURN CEIL(EXTRACT(MONTH FROM date_val) / 3)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update quarterly revenue for a job
CREATE OR REPLACE FUNCTION public.update_quarterly_revenue()
RETURNS TRIGGER AS $$
DECLARE
  quarter_num INTEGER;
  year_num INTEGER;
  q_year INTEGER;
BEGIN
  -- Get quarter and year from event_date
  IF NEW.event_date IS NOT NULL THEN
    quarter_num := public.get_quarter(NEW.event_date::TIMESTAMPTZ);
    year_num := EXTRACT(YEAR FROM NEW.event_date::TIMESTAMPTZ)::INTEGER;
    q_year := year_num;
  ELSIF NEW.created_at IS NOT NULL THEN
    quarter_num := public.get_quarter(NEW.created_at);
    year_num := EXTRACT(YEAR FROM NEW.created_at)::INTEGER;
    q_year := year_num;
  ELSE
    RETURN NEW;
  END IF;

  -- Get organization_id from warehouse if not directly available
  -- Assuming jobs have workspace/org context - adjust based on your schema
  -- For now, we'll use a placeholder that should be filled based on user context

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get current quarter revenue for an organization
CREATE OR REPLACE FUNCTION public.get_current_quarter_revenue(org_id UUID)
RETURNS TABLE (
  current_quarter INTEGER,
  current_year INTEGER,
  total_revenue NUMERIC,
  total_expenses NUMERIC,
  total_profit NUMERIC,
  job_count INTEGER
) AS $$
DECLARE
  current_q INTEGER;
  current_y INTEGER;
BEGIN
  current_q := public.get_quarter(now());
  current_y := EXTRACT(YEAR FROM now())::INTEGER;

  RETURN QUERY
  SELECT 
    current_q,
    current_y,
    COALESCE(qr.total_revenue, 0),
    COALESCE(qr.total_expenses, 0),
    COALESCE(qr.total_profit, 0),
    COALESCE(qr.job_count, 0)
  FROM quarterly_revenue qr
  WHERE qr.organization_id = org_id 
    AND qr.year = current_y 
    AND qr.quarter = current_q
  UNION ALL
  SELECT 
    current_q,
    current_y,
    0::NUMERIC,
    0::NUMERIC,
    0::NUMERIC,
    0
  WHERE NOT EXISTS (
    SELECT 1 FROM quarterly_revenue qr
    WHERE qr.organization_id = org_id 
      AND qr.year = current_y 
      AND qr.quarter = current_q
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get all quarters for a year
CREATE OR REPLACE FUNCTION public.get_year_quarterly_breakdown(org_id UUID, year_val INTEGER)
RETURNS TABLE (
  quarter INTEGER,
  total_revenue NUMERIC,
  total_expenses NUMERIC,
  total_profit NUMERIC,
  job_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qr.quarter,
    COALESCE(qr.total_revenue, 0),
    COALESCE(qr.total_expenses, 0),
    COALESCE(qr.total_profit, 0),
    COALESCE(qr.job_count, 0)
  FROM quarterly_revenue qr
  WHERE qr.organization_id = org_id AND qr.year = year_val
  ORDER BY qr.quarter;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate year-to-date revenue
CREATE OR REPLACE FUNCTION public.get_year_to_date_revenue(org_id UUID)
RETURNS TABLE (
  q1_revenue NUMERIC,
  q2_revenue NUMERIC,
  q3_revenue NUMERIC,
  q4_revenue NUMERIC,
  total_revenue NUMERIC
) AS $$
DECLARE
  current_y INTEGER;
BEGIN
  current_y := EXTRACT(YEAR FROM now())::INTEGER;

  RETURN QUERY
  SELECT 
    COALESCE((SELECT total_revenue FROM quarterly_revenue WHERE organization_id = org_id AND year = current_y AND quarter = 1), 0),
    COALESCE((SELECT total_revenue FROM quarterly_revenue WHERE organization_id = org_id AND year = current_y AND quarter = 2), 0),
    COALESCE((SELECT total_revenue FROM quarterly_revenue WHERE organization_id = org_id AND year = current_y AND quarter = 3), 0),
    COALESCE((SELECT total_revenue FROM quarterly_revenue WHERE organization_id = org_id AND year = current_y AND quarter = 4), 0),
    COALESCE((SELECT SUM(total_revenue) FROM quarterly_revenue WHERE organization_id = org_id AND year = current_y), 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.quarterly_revenue IS 'Stores quarterly revenue snapshots for each organization';
COMMENT ON TABLE public.yearly_revenue IS 'Stores yearly summary and quarterly breakdowns';
COMMENT ON FUNCTION public.get_quarter(TIMESTAMPTZ) IS 'Returns quarter number (1-4) from a timestamp';
