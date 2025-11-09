-- Add amortization tracking fields to serials (individual inventory items)
-- Run this in Supabase SQL Editor

-- Add amortization fields to serials table
ALTER TABLE serials
ADD COLUMN IF NOT EXISTS purchase_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS purchase_date DATE,
ADD COLUMN IF NOT EXISTS useful_life_years DECIMAL(4, 1) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS estimated_jobs_per_year INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS residual_value DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS amortization_per_job DECIMAL(10, 4) GENERATED ALWAYS AS (
  CASE 
    WHEN useful_life_years > 0 AND estimated_jobs_per_year > 0 
    THEN ROUND((purchase_cost - residual_value) / (useful_life_years * estimated_jobs_per_year), 4)
    ELSE 0
  END
) STORED;

-- Add depreciation tracking
ALTER TABLE serials
ADD COLUMN IF NOT EXISTS total_jobs_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS accumulated_amortization DECIMAL(10, 2) DEFAULT 0;

-- Create index for amortization queries
CREATE INDEX IF NOT EXISTS idx_serials_amortization ON serials(amortization_per_job);
CREATE INDEX IF NOT EXISTS idx_serials_purchase_date ON serials(purchase_date);

-- Comments for documentation
COMMENT ON COLUMN serials.purchase_cost IS 'Original purchase price of this specific unit';
COMMENT ON COLUMN serials.purchase_date IS 'Date this unit was purchased';
COMMENT ON COLUMN serials.useful_life_years IS 'Expected useful life in years';
COMMENT ON COLUMN serials.estimated_jobs_per_year IS 'Estimated number of jobs this unit is used on per year';
COMMENT ON COLUMN serials.residual_value IS 'Expected resale/scrap value at end of useful life';
COMMENT ON COLUMN serials.amortization_per_job IS 'Auto-calculated: cost recovery per job based on depreciation';
COMMENT ON COLUMN serials.total_jobs_used IS 'Total number of jobs this unit has been used on';
COMMENT ON COLUMN serials.accumulated_amortization IS 'Total amortization recovered so far from this unit';
