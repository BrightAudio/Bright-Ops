-- Section 179 Equipment Tracking & Tax Deduction System
-- Migration: 2025-11-20_section179_equipment.sql
-- Purpose: Replace depreciation tracking with Section 179 tax-advantaged equipment tracking

-- Drop old depreciation tables if they exist
DROP TABLE IF EXISTS financing_asset_depreciation_schedule CASCADE;
DROP TABLE IF EXISTS financing_assets CASCADE;

-- =====================================================
-- Equipment Items Table
-- =====================================================
-- Tracks equipment financed through the system with Section 179 eligibility
CREATE TABLE IF NOT EXISTS equipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financing_id UUID NOT NULL REFERENCES financing_applications(id) ON DELETE CASCADE,
    
    -- Equipment Identification
    asset_tag VARCHAR(100),
    sku VARCHAR(100),
    description TEXT NOT NULL,
    serial_number VARCHAR(200),
    
    -- Financial Details
    purchase_cost DECIMAL(12, 2) NOT NULL CHECK (purchase_cost > 0),
    placed_in_service_date DATE NOT NULL,
    
    -- Section 179 Specific Fields
    business_use_percent DECIMAL(5, 2) NOT NULL DEFAULT 100.00 CHECK (business_use_percent >= 0 AND business_use_percent <= 100),
    depreciation_life_years INTEGER NOT NULL DEFAULT 5 CHECK (depreciation_life_years IN (3, 5, 7, 10, 15, 20)),
    section_179_elected_amount DECIMAL(12, 2) DEFAULT 0.00 CHECK (section_179_elected_amount >= 0),
    bonus_depreciation_percentage DECIMAL(5, 2) DEFAULT 60.00 CHECK (bonus_depreciation_percentage >= 0 AND bonus_depreciation_percentage <= 100),
    
    -- Fair Market Value (FMV) Tracking - Internal Use Only
    equipment_category VARCHAR(50) CHECK (equipment_category IN ('audio_gear', 'speakers', 'lighting', 'mixers_controllers', 'other')),
    residual_percentage DECIMAL(5, 2) DEFAULT 15.00 CHECK (residual_percentage >= 0 AND residual_percentage <= 100),
    calculated_fmv DECIMAL(12, 2),
    fmv_calculation_date DATE,
    transfer_method VARCHAR(50) CHECK (transfer_method IN ('sale_at_fmv_internal', 'sale_customer_paid', 'return', 'default_repossession')),
    amount_realized DECIMAL(12, 2),
    customer_amount_paid DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Taxable Income Calculation (Lease-to-Own Completion)
    total_lease_payments DECIMAL(12, 2), -- Sum of all payments received
    adjusted_basis DECIMAL(12, 2), -- Purchase cost - Section 179 - Bonus depreciation
    taxable_income DECIMAL(12, 2), -- TotalLeasePayments + FMV - AdjustedBasis
    taxable_income_calculation_date DATE,
    
    -- Insurance Tracking (required for equipment $10k+)
    insurance_required BOOLEAN DEFAULT FALSE,
    insurance_policy_number VARCHAR(100),
    insurance_expiry_date DATE,
    
    -- Status & Metadata
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'disposed', 'lost', 'stolen', 'transferred_to_customer')),
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_financing_id ON equipment_items(financing_id);
CREATE INDEX IF NOT EXISTS idx_equipment_placed_in_service ON equipment_items(placed_in_service_date);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment_items(status);
CREATE INDEX IF NOT EXISTS idx_equipment_asset_tag ON equipment_items(asset_tag);

-- Trigger to auto-set insurance_required and calculate FMV for equipment
CREATE OR REPLACE FUNCTION set_insurance_and_fmv()
RETURNS TRIGGER AS $$
DECLARE
    base_residual DECIMAL(5, 2);
    lease_term_months INTEGER;
    term_adjustment DECIMAL(5, 2);
BEGIN
    -- Set insurance requirement for equipment >= $10,000
    IF NEW.purchase_cost >= 10000 THEN
        NEW.insurance_required = TRUE;
    ELSE
        NEW.insurance_required = FALSE;
    END IF;
    
    -- Auto-calculate FMV based on equipment category
    IF NEW.equipment_category IS NOT NULL THEN
        -- Get lease term from financing application
        SELECT term_months INTO lease_term_months
        FROM financing_applications
        WHERE id = NEW.financing_id;
        
        -- Determine base residual percentage by category
        CASE NEW.equipment_category
            WHEN 'audio_gear' THEN base_residual := 15.00;
            WHEN 'speakers' THEN base_residual := 25.00;
            WHEN 'lighting' THEN base_residual := 20.00;
            WHEN 'mixers_controllers' THEN base_residual := 15.00;
            ELSE base_residual := 15.00;
        END CASE;
        
        -- Adjust residual based on actual lease term
        IF lease_term_months IS NOT NULL THEN
            IF lease_term_months <= 12 THEN
                term_adjustment := 10.00;
            ELSIF lease_term_months <= 24 THEN
                term_adjustment := 5.00;
            ELSE
                term_adjustment := 0.00;
            END IF;
            
            NEW.residual_percentage := LEAST(100.00, base_residual + term_adjustment);
        ELSE
            NEW.residual_percentage := base_residual;
        END IF;
        
        -- Always calculate FMV when category is set
        NEW.calculated_fmv := ROUND(NEW.purchase_cost * (NEW.residual_percentage / 100.0), 2);
        NEW.fmv_calculation_date := CURRENT_DATE;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS equipment_insurance_trigger ON equipment_items;
CREATE TRIGGER equipment_insurance_trigger
    BEFORE INSERT OR UPDATE ON equipment_items
    FOR EACH ROW
    EXECUTE FUNCTION set_insurance_and_fmv();

-- Function to calculate taxable income when lease completes
-- TaxableIncome = TotalLeasePayments + FMV - AdjustedBasis
-- AdjustedBasis = PurchaseCost - Section179Elected - BonusDepreciation
CREATE OR REPLACE FUNCTION calculate_taxable_income(equipment_id UUID)
RETURNS TABLE(
    taxable_income DECIMAL(12, 2),
    total_payments DECIMAL(12, 2),
    fmv DECIMAL(12, 2),
    adjusted_basis DECIMAL(12, 2),
    purchase_cost DECIMAL(12, 2),
    section_179 DECIMAL(12, 2),
    bonus_depreciation DECIMAL(12, 2)
) AS $$
DECLARE
    v_equipment RECORD;
    v_total_payments DECIMAL(12, 2);
    v_purchase_cost DECIMAL(12, 2);
    v_section_179 DECIMAL(12, 2);
    v_bonus_percent DECIMAL(5, 2);
    v_bonus_amount DECIMAL(12, 2);
    v_adjusted_basis DECIMAL(12, 2);
    v_fmv DECIMAL(12, 2);
    v_taxable_income DECIMAL(12, 2);
BEGIN
    -- Get equipment details
    SELECT * INTO v_equipment
    FROM equipment_items
    WHERE id = equipment_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Equipment not found';
    END IF;
    
    -- Get total lease payments from financing application
    SELECT COALESCE(SUM(fp.amount), 0) INTO v_total_payments
    FROM financing_payments fp
    WHERE fp.application_id = v_equipment.financing_id
    AND fp.status = 'paid';
    
    -- Get values
    v_purchase_cost := v_equipment.purchase_cost;
    v_section_179 := COALESCE(v_equipment.section_179_elected_amount, 0);
    v_bonus_percent := COALESCE(v_equipment.bonus_depreciation_percentage, 0);
    v_fmv := COALESCE(v_equipment.calculated_fmv, 0);
    
    -- Calculate bonus depreciation: (PurchaseCost - Section179) * BonusPercent
    v_bonus_amount := ROUND((v_purchase_cost - v_section_179) * (v_bonus_percent / 100.0), 2);
    
    -- Calculate adjusted basis: PurchaseCost - Section179 - BonusDepreciation
    v_adjusted_basis := v_purchase_cost - v_section_179 - v_bonus_amount;
    
    -- Calculate taxable income: TotalLeasePayments + FMV - AdjustedBasis
    v_taxable_income := v_total_payments + v_fmv - v_adjusted_basis;
    
    -- Return results
    RETURN QUERY SELECT 
        v_taxable_income,
        v_total_payments,
        v_fmv,
        v_adjusted_basis,
        v_purchase_cost,
        v_section_179,
        v_bonus_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to complete lease and record taxable income
CREATE OR REPLACE FUNCTION complete_lease_transfer(equipment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_calc RECORD;
BEGIN
    -- Calculate taxable income
    SELECT * INTO v_calc FROM calculate_taxable_income(equipment_id);
    
    -- Update equipment with taxable income calculation
    UPDATE equipment_items
    SET 
        status = 'transferred_to_customer',
        total_lease_payments = v_calc.total_payments,
        adjusted_basis = v_calc.adjusted_basis,
        amount_realized = v_calc.fmv,
        taxable_income = v_calc.taxable_income,
        taxable_income_calculation_date = CURRENT_DATE,
        transfer_method = 'sale_at_fmv_internal',
        updated_at = NOW()
    WHERE id = equipment_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Section 179 Settings Table
-- =====================================================
-- Configurable tax year limits and thresholds
CREATE TABLE IF NOT EXISTS section179_settings (
    tax_year INTEGER PRIMARY KEY CHECK (tax_year >= 2020 AND tax_year <= 2030),
    
    -- IRS Limits (updated annually)
    max_section_179_deduction DECIMAL(12, 2) NOT NULL DEFAULT 1220000.00,
    phaseout_threshold DECIMAL(12, 2) NOT NULL DEFAULT 3050000.00,
    
    -- Bonus Depreciation
    bonus_depreciation_allowed BOOLEAN DEFAULT TRUE,
    bonus_depr_percentage DECIMAL(5, 2) DEFAULT 60.00 CHECK (bonus_depr_percentage >= 0 AND bonus_depr_percentage <= 100),
    
    -- Eligibility Rules
    min_business_use_percent DECIMAL(5, 2) DEFAULT 50.00 CHECK (min_business_use_percent >= 0 AND min_business_use_percent <= 100),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Trigger function for updated_at timestamp on settings
CREATE OR REPLACE FUNCTION update_section179_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at timestamp
DROP TRIGGER IF EXISTS section179_settings_updated ON section179_settings;
CREATE TRIGGER section179_settings_updated
    BEFORE UPDATE ON section179_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_section179_settings_timestamp();

-- Seed default settings for 2024-2026
INSERT INTO section179_settings (tax_year, max_section_179_deduction, phaseout_threshold, bonus_depr_percentage, min_business_use_percent, notes)
VALUES 
    (2024, 1220000.00, 3050000.00, 80.00, 50.00, 'IRS limits for tax year 2024 - 80% bonus depreciation'),
    (2025, 1220000.00, 3050000.00, 60.00, 50.00, 'IRS limits for tax year 2025 - 60% bonus depreciation (projected)'),
    (2026, 1250000.00, 3130000.00, 40.00, 50.00, 'IRS limits for tax year 2026 - 40% bonus depreciation (projected)')
ON CONFLICT (tax_year) DO NOTHING;

-- =====================================================
-- Section 179 Batch Allocation Runs (Audit Trail)
-- =====================================================
-- Tracks auto-allocation runs for compliance and audit purposes
CREATE TABLE IF NOT EXISTS section179_batch_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tax_year INTEGER NOT NULL,
    
    -- Allocation Summary
    total_equipment_cost DECIMAL(12, 2) NOT NULL,
    total_eligible_cost DECIMAL(12, 2) NOT NULL,
    total_section_179_allocated DECIMAL(12, 2) NOT NULL,
    equipment_count INTEGER NOT NULL,
    eligible_equipment_count INTEGER NOT NULL,
    
    -- Limits Applied
    max_deduction_limit DECIMAL(12, 2) NOT NULL,
    remaining_capacity DECIMAL(12, 2) NOT NULL,
    
    -- Metadata
    allocation_method VARCHAR(50) DEFAULT 'greedy_largest_first',
    notes TEXT,
    run_at TIMESTAMPTZ DEFAULT NOW(),
    run_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_batch_runs_tax_year ON section179_batch_runs(tax_year);
CREATE INDEX IF NOT EXISTS idx_batch_runs_date ON section179_batch_runs(run_at);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE section179_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE section179_batch_runs ENABLE ROW LEVEL SECURITY;

-- Equipment Items Policies
DROP POLICY IF EXISTS "Users can view all equipment items" ON equipment_items;
CREATE POLICY "Users can view all equipment items" 
    ON equipment_items FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert equipment items" ON equipment_items;
CREATE POLICY "Authenticated users can insert equipment items" 
    ON equipment_items FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update equipment items" ON equipment_items;
CREATE POLICY "Authenticated users can update equipment items" 
    ON equipment_items FOR UPDATE 
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete equipment items" ON equipment_items;
CREATE POLICY "Authenticated users can delete equipment items" 
    ON equipment_items FOR DELETE 
    USING (auth.role() = 'authenticated');

-- Section 179 Settings Policies
DROP POLICY IF EXISTS "Users can view Section 179 settings" ON section179_settings;
CREATE POLICY "Users can view Section 179 settings" 
    ON section179_settings FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can modify Section 179 settings" ON section179_settings;
CREATE POLICY "Authenticated users can modify Section 179 settings" 
    ON section179_settings FOR ALL 
    USING (auth.role() = 'authenticated');

-- Batch Runs Policies
DROP POLICY IF EXISTS "Users can view batch allocation runs" ON section179_batch_runs;
CREATE POLICY "Users can view batch allocation runs" 
    ON section179_batch_runs FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can create batch runs" ON section179_batch_runs;
CREATE POLICY "Authenticated users can create batch runs" 
    ON section179_batch_runs FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- Helper Views
-- =====================================================

-- View: Equipment with calculated Section 179 eligibility
CREATE OR REPLACE VIEW equipment_section179_summary AS
SELECT 
    e.id,
    e.financing_id,
    e.asset_tag,
    e.description,
    e.purchase_cost,
    e.placed_in_service_date,
    EXTRACT(YEAR FROM e.placed_in_service_date) AS tax_year,
    e.business_use_percent,
    e.depreciation_life_years,
    
    -- Calculated eligible cost for Section 179
    ROUND(e.purchase_cost * (e.business_use_percent / 100.0), 2) AS eligible_cost,
    
    e.section_179_elected_amount,
    e.bonus_depreciation_percentage,
    
    -- Remaining basis after Section 179
    ROUND(
        (e.purchase_cost * (e.business_use_percent / 100.0)) - COALESCE(e.section_179_elected_amount, 0),
        2
    ) AS remaining_basis,
    
    -- Bonus depreciation amount
    ROUND(
        (
            (e.purchase_cost * (e.business_use_percent / 100.0)) - COALESCE(e.section_179_elected_amount, 0)
        ) * (e.bonus_depreciation_percentage / 100.0),
        2
    ) AS bonus_depreciation_amount,
    
    e.insurance_required,
    e.status,
    
    -- Join financing application details
    fa.client_name,
    fa.business_name,
    fa.loan_amount AS financing_amount
FROM equipment_items e
LEFT JOIN financing_applications fa ON e.financing_id = fa.id
WHERE e.status = 'active';

-- Grant access to views
GRANT SELECT ON equipment_section179_summary TO authenticated;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE equipment_items IS 'Equipment purchased through financing with Section 179 tax deduction tracking';
COMMENT ON TABLE section179_settings IS 'Annual IRS Section 179 limits and bonus depreciation percentages';
COMMENT ON TABLE section179_batch_runs IS 'Audit trail for Section 179 auto-allocation batch runs';

COMMENT ON COLUMN equipment_items.business_use_percent IS 'Percentage of business use (must be >= 50% for Section 179 eligibility)';
COMMENT ON COLUMN equipment_items.section_179_elected_amount IS 'Amount elected for Section 179 deduction (allocated by auto-allocation or manually set)';
COMMENT ON COLUMN equipment_items.bonus_depreciation_percentage IS 'Bonus depreciation percentage applied to remaining basis after Section 179';
COMMENT ON COLUMN equipment_items.insurance_required IS 'Auto-set to TRUE for equipment >= $10,000';
COMMENT ON COLUMN equipment_items.equipment_category IS 'Equipment type for FMV calculation: audio_gear (15%), speakers (25%), lighting (20%), mixers_controllers (15%)';
COMMENT ON COLUMN equipment_items.residual_percentage IS 'Auto-calculated residual percentage based on equipment category and lease term';
COMMENT ON COLUMN equipment_items.calculated_fmv IS 'Fair Market Value at end of lease (auto-calculated: purchase_cost × residual_percentage) - INTERNAL USE ONLY';
COMMENT ON COLUMN equipment_items.transfer_method IS 'How ownership transferred: sale_at_fmv_internal (customer pays $0, FMV recorded for taxes), sale_customer_paid, return, default_repossession';
COMMENT ON COLUMN equipment_items.amount_realized IS 'FMV amount realized for tax purposes (even if customer_amount_paid = 0)';
COMMENT ON COLUMN equipment_items.customer_amount_paid IS 'Actual amount customer paid for transfer (typically $0 for lease-to-own completion)';

COMMENT ON VIEW equipment_section179_summary IS 'Aggregated view showing Section 179 eligibility, elected amounts, and remaining basis calculations';
