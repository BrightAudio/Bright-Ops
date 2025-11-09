-- Rename income to cost_estimate_amount in jobs table
-- Run this in Supabase SQL Editor

-- First, drop the computed profit column since it depends on income
ALTER TABLE jobs DROP COLUMN IF EXISTS profit;

-- Rename income to cost_estimate_amount
ALTER TABLE jobs RENAME COLUMN income TO cost_estimate_amount;

-- Add new columns for invoice tracking
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS suggested_invoice_amount DECIMAL(10, 2) GENERATED ALWAYS AS (COALESCE(cost_estimate_amount, 0) * 1.40) STORED,
ADD COLUMN IF NOT EXISTS final_invoice_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS invoice_status TEXT DEFAULT 'draft'; -- 'draft', 'sent', 'paid'

-- Recreate profit column with new name
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS profit DECIMAL(10, 2) GENERATED ALWAYS AS (COALESCE(final_invoice_amount, cost_estimate_amount, 0) - COALESCE(labor_cost, 0)) STORED;

-- Update comments
COMMENT ON COLUMN jobs.cost_estimate_amount IS 'Base cost estimate for the job (equipment rental + labor)';
COMMENT ON COLUMN jobs.suggested_invoice_amount IS 'Suggested invoice amount (cost estimate + 40% markup)';
COMMENT ON COLUMN jobs.final_invoice_amount IS 'Final invoice amount sent to client (editable)';
COMMENT ON COLUMN jobs.invoice_status IS 'Invoice status: draft, sent, or paid';
COMMENT ON COLUMN jobs.labor_cost IS 'Total labor cost (calculated from assignments)';
COMMENT ON COLUMN jobs.profit IS 'Calculated profit (final_invoice_amount - labor_cost)';
