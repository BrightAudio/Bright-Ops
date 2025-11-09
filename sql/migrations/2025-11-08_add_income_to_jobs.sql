-- Add income and profit tracking to jobs table
-- Run this in Supabase SQL Editor

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS income DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit DECIMAL(10, 2) GENERATED ALWAYS AS (COALESCE(income, 0) - COALESCE(labor_cost, 0)) STORED;

COMMENT ON COLUMN jobs.income IS 'Total income/revenue for the job';
COMMENT ON COLUMN jobs.labor_cost IS 'Total labor cost (calculated from assignments)';
COMMENT ON COLUMN jobs.profit IS 'Calculated profit (income - labor_cost)';
