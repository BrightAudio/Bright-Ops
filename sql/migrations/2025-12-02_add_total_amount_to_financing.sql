-- Add total_amount column to financing_applications table
-- This represents the total amount of the financing (could be different from loan_amount with fees)

ALTER TABLE financing_applications 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2);

-- Set default values based on existing loan_amount
UPDATE financing_applications 
SET total_amount = loan_amount 
WHERE total_amount IS NULL;

-- Make monthly_payment nullable (can be calculated later)
ALTER TABLE financing_applications 
ALTER COLUMN monthly_payment DROP NOT NULL;

-- Make interest_rate nullable (may not be set initially)
ALTER TABLE financing_applications 
ALTER COLUMN interest_rate DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN financing_applications.total_amount IS 'Total financing amount including all fees and charges';
