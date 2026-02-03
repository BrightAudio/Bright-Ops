-- ============================================
-- JOB COMPLETION TRACKING & QUARTERLY REVENUE AUTO-UPDATE
-- Automatically updates quarterly_revenue when jobs are marked complete
-- ============================================

-- Add completed_at column to jobs table (if not already present)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create index for faster queries on completed jobs
CREATE INDEX IF NOT EXISTS idx_jobs_completed_at ON public.jobs(completed_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status_completed ON public.jobs(status, completed_at);

-- Update existing jobs where status = 'completed' to set completed_at to end_date or created_at
UPDATE public.jobs 
SET completed_at = COALESCE(end_date::TIMESTAMPTZ, created_at)
WHERE status = 'completed' AND completed_at IS NULL;

-- ============================================
-- TRIGGER FUNCTION: Update quarterly_revenue when a job is completed or updated
-- ============================================
CREATE OR REPLACE FUNCTION public.update_quarterly_revenue_on_job_update()
RETURNS TRIGGER AS $$
DECLARE
  quarter_num INTEGER;
  year_num INTEGER;
  org_id UUID;
  old_quarter_key TEXT;
  new_quarter_key TEXT;
  completed_date TIMESTAMPTZ;
BEGIN
  -- Determine if this is a completion event
  IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' AND NEW.income IS NOT NULL) THEN
    
    -- Get completion date (use completed_at or event_date or now)
    completed_date := COALESCE(NEW.completed_at, NEW.event_date, now());
    
    quarter_num := public.get_quarter(completed_date);
    year_num := EXTRACT(YEAR FROM completed_date)::INTEGER;
    
    -- Get organization_id from warehouse
    SELECT w.organization_id INTO org_id
    FROM public.warehouses w
    WHERE w.id = NEW.warehouse_id
    LIMIT 1;
    
    -- If warehouse_id doesn't exist, try to get from user_profiles (fallback)
    IF org_id IS NULL THEN
      -- You may need to adjust this based on your actual user context
      -- For now, this requires warehouse_id to be set
      RETURN NEW;
    END IF;
    
    -- Insert or update quarterly_revenue record
    INSERT INTO public.quarterly_revenue (
      organization_id,
      year,
      quarter,
      total_revenue,
      total_expenses,
      total_profit,
      job_count,
      created_at,
      updated_at
    ) VALUES (
      org_id,
      year_num,
      quarter_num,
      COALESCE(NEW.income, 0),
      COALESCE(NEW.labor_cost, 0) + COALESCE(NEW.total_amortization, 0),
      COALESCE(NEW.profit, 0),
      1,
      now(),
      now()
    )
    ON CONFLICT (organization_id, year, quarter) DO UPDATE SET
      total_revenue = quarterly_revenue.total_revenue + EXCLUDED.total_revenue,
      total_expenses = quarterly_revenue.total_expenses + EXCLUDED.total_expenses,
      total_profit = quarterly_revenue.total_profit + EXCLUDED.total_profit,
      job_count = quarterly_revenue.job_count + EXCLUDED.job_count,
      updated_at = now();
    
  ELSIF (OLD.income IS DISTINCT FROM NEW.income OR OLD.profit IS DISTINCT FROM NEW.profit) 
    AND NEW.status = 'completed' 
    AND NEW.income IS NOT NULL THEN
    -- Update case: when income or profit changes for a completed job
    
    completed_date := COALESCE(NEW.completed_at, NEW.event_date, now());
    quarter_num := public.get_quarter(completed_date);
    year_num := EXTRACT(YEAR FROM completed_date)::INTEGER;
    
    SELECT w.organization_id INTO org_id
    FROM public.warehouses w
    WHERE w.id = NEW.warehouse_id
    LIMIT 1;
    
    IF org_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Calculate the difference
    DECLARE
      revenue_diff NUMERIC;
      expense_diff NUMERIC;
      profit_diff NUMERIC;
    BEGIN
      revenue_diff := COALESCE(NEW.income, 0) - COALESCE(OLD.income, 0);
      expense_diff := (COALESCE(NEW.labor_cost, 0) + COALESCE(NEW.total_amortization, 0)) - 
                      (COALESCE(OLD.labor_cost, 0) + COALESCE(OLD.total_amortization, 0));
      profit_diff := COALESCE(NEW.profit, 0) - COALESCE(OLD.profit, 0);
      
      UPDATE public.quarterly_revenue
      SET 
        total_revenue = total_revenue + revenue_diff,
        total_expenses = total_expenses + expense_diff,
        total_profit = total_profit + profit_diff,
        updated_at = now()
      WHERE organization_id = org_id 
        AND year = year_num 
        AND quarter = quarter_num;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_quarterly_revenue_trigger ON public.jobs;

CREATE TRIGGER update_quarterly_revenue_trigger
AFTER UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_quarterly_revenue_on_job_update();

-- ============================================
-- Helper function to mark job as completed
-- ============================================
CREATE OR REPLACE FUNCTION public.complete_job(job_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  status TEXT,
  completed_at TIMESTAMPTZ,
  income NUMERIC,
  profit NUMERIC
) AS $$
BEGIN
  UPDATE public.jobs
  SET 
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = job_id
  RETURNING jobs.id, jobs.title, jobs.status, jobs.completed_at, jobs.income::NUMERIC, jobs.profit::NUMERIC
  INTO id, title, status, completed_at, income, profit;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- View for completed jobs by quarter
-- ============================================
CREATE OR REPLACE VIEW public.completed_jobs_by_quarter AS
SELECT 
  j.id,
  j.title,
  j.event_date,
  j.completed_at,
  j.income,
  j.profit,
  public.get_quarter(COALESCE(j.completed_at, j.event_date, j.created_at)) AS quarter,
  EXTRACT(YEAR FROM COALESCE(j.completed_at, j.event_date, j.created_at))::INTEGER AS year,
  w.organization_id
FROM public.jobs j
LEFT JOIN public.warehouses w ON j.warehouse_id = w.id
WHERE j.status = 'completed' AND j.income IS NOT NULL;

-- ============================================
-- Utility function to get completed jobs for a quarter
-- ============================================
CREATE OR REPLACE FUNCTION public.get_completed_jobs_for_quarter(
  org_id UUID,
  year_val INTEGER,
  quarter_val INTEGER
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  event_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  income NUMERIC,
  profit NUMERIC,
  margin_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.event_date,
    j.completed_at,
    j.income::NUMERIC,
    j.profit::NUMERIC,
    CASE 
      WHEN j.income > 0 THEN ((j.profit / j.income) * 100)::NUMERIC
      ELSE 0
    END AS margin_percent
  FROM public.jobs j
  LEFT JOIN public.warehouses w ON j.warehouse_id = w.id
  WHERE 
    j.status = 'completed' 
    AND j.income IS NOT NULL
    AND w.organization_id = org_id
    AND EXTRACT(YEAR FROM COALESCE(j.completed_at, j.event_date))::INTEGER = year_val
    AND public.get_quarter(COALESCE(j.completed_at, j.event_date)) = quarter_val
  ORDER BY j.completed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function to get summary by completion status
-- ============================================
CREATE OR REPLACE FUNCTION public.get_jobs_by_status(org_id UUID)
RETURNS TABLE (
  status TEXT,
  job_count INTEGER,
  total_revenue NUMERIC,
  total_profit NUMERIC,
  avg_profit_margin NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.status,
    COUNT(*)::INTEGER,
    SUM(COALESCE(j.income, 0))::NUMERIC,
    SUM(COALESCE(j.profit, 0))::NUMERIC,
    CASE 
      WHEN SUM(COALESCE(j.income, 0)) > 0 THEN 
        (SUM(COALESCE(j.profit, 0)) / SUM(COALESCE(j.income, 0)) * 100)::NUMERIC
      ELSE 0
    END AS avg_profit_margin
  FROM public.jobs j
  LEFT JOIN public.warehouses w ON j.warehouse_id = w.id
  WHERE w.organization_id = org_id
  GROUP BY j.status;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_quarterly_revenue_on_job_update() IS 'Automatically updates quarterly_revenue when a job is marked complete';
COMMENT ON FUNCTION public.complete_job(UUID) IS 'Marks a job as completed and triggers quarterly revenue update';
COMMENT ON VIEW public.completed_jobs_by_quarter IS 'View showing all completed jobs grouped by quarter';
