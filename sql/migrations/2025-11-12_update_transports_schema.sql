-- ============================================================================
-- Migration: Update transports table schema
-- Date: 2025-11-12
-- Description: Add vehicle, driver, depart_at, arrive_at, notes columns to transports table
-- ============================================================================

-- Add new columns to transports table
ALTER TABLE public.transports
  ADD COLUMN IF NOT EXISTS vehicle TEXT,
  ADD COLUMN IF NOT EXISTS driver TEXT,
  ADD COLUMN IF NOT EXISTS depart_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arrive_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Optional: Migrate existing data from old columns to new ones
UPDATE public.transports
SET 
  depart_at = scheduled_at
WHERE depart_at IS NULL AND scheduled_at IS NOT NULL;

-- Create indexes for the new datetime columns
CREATE INDEX IF NOT EXISTS idx_transports_depart_at ON public.transports(depart_at);
CREATE INDEX IF NOT EXISTS idx_transports_arrive_at ON public.transports(arrive_at);

-- Note: The old columns (type, scheduled_at) are kept for backwards compatibility
-- You can drop them later if they're no longer needed:
-- ALTER TABLE public.transports DROP COLUMN IF EXISTS type;
-- ALTER TABLE public.transports DROP COLUMN IF EXISTS scheduled_at;
