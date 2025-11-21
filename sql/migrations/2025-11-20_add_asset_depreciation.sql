-- Add down payment fields to financing_applications
ALTER TABLE financing_applications
ADD COLUMN IF NOT EXISTS down_payment_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS down_payment_percentage DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS down_payment_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS down_payment_date TIMESTAMP WITH TIME ZONE;

-- Add late fee tracking to financing_payments
ALTER TABLE financing_payments
ADD COLUMN IF NOT EXISTS late_fee DECIMAL(12, 2) DEFAULT 0;

-- Create financing_assets table for tracking depreciation
CREATE TABLE IF NOT EXISTS financing_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES financing_applications(id) ON DELETE CASCADE,
  
  -- Asset Details
  asset_name TEXT NOT NULL,
  asset_description TEXT,
  asset_category TEXT, -- 'audio_equipment', 'lighting', 'video', 'other'
  serial_number TEXT,
  
  -- Financial Details
  purchase_cost DECIMAL(12, 2) NOT NULL,
  depreciation_method TEXT DEFAULT 'straight_line' CHECK (depreciation_method IN ('straight_line', 'declining_balance', 'macrs')),
  depreciation_period_years INTEGER DEFAULT 5, -- IRS typically 5-7 years for equipment
  salvage_value DECIMAL(12, 2) DEFAULT 0,
  
  -- Depreciation Tracking
  current_book_value DECIMAL(12, 2) NOT NULL,
  total_depreciation DECIMAL(12, 2) DEFAULT 0,
  annual_depreciation_amount DECIMAL(12, 2),
  
  -- Ownership & Insurance
  ownership_status TEXT DEFAULT 'company_owned' CHECK (ownership_status IN ('company_owned', 'customer_owned', 'transferred')),
  transfer_date TIMESTAMP WITH TIME ZONE,
  insurance_required BOOLEAN DEFAULT false,
  insurance_policy_number TEXT,
  insurance_expiration DATE,
  
  -- Metadata
  purchase_date DATE NOT NULL,
  placed_in_service_date DATE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create financing_asset_depreciation_schedule table
CREATE TABLE IF NOT EXISTS financing_asset_depreciation_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES financing_assets(id) ON DELETE CASCADE,
  
  -- Schedule Details
  year INTEGER NOT NULL,
  depreciation_amount DECIMAL(12, 2) NOT NULL,
  accumulated_depreciation DECIMAL(12, 2) NOT NULL,
  book_value DECIMAL(12, 2) NOT NULL,
  
  -- Status
  is_recorded BOOLEAN DEFAULT false,
  recorded_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_financing_assets_application_id ON financing_assets(application_id);
CREATE INDEX IF NOT EXISTS idx_financing_assets_ownership ON financing_assets(ownership_status);
CREATE INDEX IF NOT EXISTS idx_financing_asset_depreciation_asset_id ON financing_asset_depreciation_schedule(asset_id);

-- Enable RLS
ALTER TABLE financing_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing_asset_depreciation_schedule ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view financing assets" ON financing_assets;
DROP POLICY IF EXISTS "Allow authenticated users to create financing assets" ON financing_assets;
DROP POLICY IF EXISTS "Allow authenticated users to update financing assets" ON financing_assets;
DROP POLICY IF EXISTS "Allow authenticated users to delete financing assets" ON financing_assets;
DROP POLICY IF EXISTS "Allow authenticated users to view depreciation schedule" ON financing_asset_depreciation_schedule;
DROP POLICY IF EXISTS "Allow authenticated users to manage depreciation schedule" ON financing_asset_depreciation_schedule;

-- RLS Policies for financing_assets
CREATE POLICY "Allow authenticated users to view financing assets"
  ON financing_assets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create financing assets"
  ON financing_assets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update financing assets"
  ON financing_assets FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete financing assets"
  ON financing_assets FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for financing_asset_depreciation_schedule
CREATE POLICY "Allow authenticated users to view depreciation schedule"
  ON financing_asset_depreciation_schedule FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage depreciation schedule"
  ON financing_asset_depreciation_schedule FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to generate depreciation schedule
CREATE OR REPLACE FUNCTION generate_depreciation_schedule()
RETURNS TRIGGER AS $$
DECLARE
  year_num INTEGER;
  annual_depr DECIMAL(12, 2);
  accum_depr DECIMAL(12, 2);
  book_val DECIMAL(12, 2);
  depreciable_amount DECIMAL(12, 2);
BEGIN
  -- Calculate depreciable amount (cost - salvage value)
  depreciable_amount := NEW.purchase_cost - NEW.salvage_value;
  
  -- Calculate annual depreciation (straight line method)
  annual_depr := depreciable_amount / NEW.depreciation_period_years;
  NEW.annual_depreciation_amount := annual_depr;
  
  -- Delete existing schedule if updating
  DELETE FROM financing_asset_depreciation_schedule WHERE asset_id = NEW.id;
  
  -- Generate schedule for each year
  accum_depr := 0;
  book_val := NEW.purchase_cost;
  
  FOR year_num IN 1..NEW.depreciation_period_years LOOP
    accum_depr := accum_depr + annual_depr;
    book_val := NEW.purchase_cost - accum_depr;
    
    -- Ensure book value doesn't go below salvage value
    IF book_val < NEW.salvage_value THEN
      book_val := NEW.salvage_value;
      annual_depr := NEW.purchase_cost - NEW.salvage_value - (accum_depr - annual_depr);
      accum_depr := NEW.purchase_cost - NEW.salvage_value;
    END IF;
    
    INSERT INTO financing_asset_depreciation_schedule (
      asset_id,
      year,
      depreciation_amount,
      accumulated_depreciation,
      book_value
    ) VALUES (
      NEW.id,
      year_num,
      annual_depr,
      accum_depr,
      book_val
    );
    
    -- Stop if we've reached salvage value
    IF book_val <= NEW.salvage_value THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Set current book value
  NEW.current_book_value := NEW.purchase_cost;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate depreciation schedule when asset is created or updated
DROP TRIGGER IF EXISTS generate_depreciation_schedule_trigger ON financing_assets;
CREATE TRIGGER generate_depreciation_schedule_trigger
  BEFORE INSERT OR UPDATE OF purchase_cost, salvage_value, depreciation_period_years
  ON financing_assets
  FOR EACH ROW
  EXECUTE FUNCTION generate_depreciation_schedule();
