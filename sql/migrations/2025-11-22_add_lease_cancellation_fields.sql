-- Add fields for lease cancellation and equipment archiving
-- Migration: 2025-11-22_add_lease_cancellation_fields.sql

-- First, update any invalid statuses to 'active' (or check what exists)
-- This prevents constraint violation errors
UPDATE financing_applications 
SET status = 'active' 
WHERE status NOT IN ('pending', 'approved', 'active', 'completed', 'defaulted', 'cancelled', 'rejected');

-- Add cancelled status to financing_applications
ALTER TABLE financing_applications
DROP CONSTRAINT IF EXISTS financing_applications_status_check;

ALTER TABLE financing_applications
ADD CONSTRAINT financing_applications_status_check 
CHECK (status IN ('pending', 'approved', 'active', 'completed', 'defaulted', 'cancelled', 'rejected'));

-- Add archived status to equipment_items if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'equipment_items_status_check'
    ) THEN
        ALTER TABLE equipment_items
        DROP CONSTRAINT IF EXISTS equipment_items_status_check;
        
        ALTER TABLE equipment_items
        ADD CONSTRAINT equipment_items_status_check 
        CHECK (status IN ('active', 'sold', 'disposed', 'lost', 'stolen', 'transferred_to_customer', 'archived'));
    ELSE
        -- If constraint exists, recreate it with archived status
        ALTER TABLE equipment_items
        DROP CONSTRAINT equipment_items_status_check;
        
        ALTER TABLE equipment_items
        ADD CONSTRAINT equipment_items_status_check 
        CHECK (status IN ('active', 'sold', 'disposed', 'lost', 'stolen', 'transferred_to_customer', 'archived'));
    END IF;
END $$;

-- Add cancellation tracking fields to financing_applications
ALTER TABLE financing_applications
ADD COLUMN IF NOT EXISTS cancelled_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_term_months INTEGER,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add index for archived equipment
CREATE INDEX IF NOT EXISTS idx_equipment_archived ON equipment_items(status) WHERE status = 'archived';

-- Add index for cancelled leases
CREATE INDEX IF NOT EXISTS idx_financing_cancelled ON financing_applications(status) WHERE status = 'cancelled';

COMMENT ON COLUMN financing_applications.cancelled_date IS 'Date when the lease was cancelled';
COMMENT ON COLUMN financing_applications.actual_term_months IS 'Actual number of months the lease was active before cancellation';
COMMENT ON COLUMN financing_applications.cancellation_reason IS 'Reason for lease cancellation';
