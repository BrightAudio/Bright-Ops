-- Complete Pull Sheets Setup with Job Links
-- Run this in Supabase SQL Editor to ensure everything is configured

-- ==========================================
-- STEP 1: Ensure pull_sheets table exists with all fields
-- ==========================================
CREATE TABLE IF NOT EXISTS public.pull_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE DEFAULT ('PS-' || to_char(now(), 'YYMMDDHH24MISS') || '-' || substr(gen_random_uuid()::text, 1, 4)),
  name text NOT NULL,
  job_id uuid,
  status text NOT NULL DEFAULT 'draft',
  scheduled_out_at timestamptz,
  expected_return_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add missing columns if table already exists
ALTER TABLE public.pull_sheets
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS job_id uuid,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS scheduled_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS expected_return_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure constraints
ALTER TABLE public.pull_sheets
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'draft',
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

-- ==========================================
-- STEP 2: Ensure pull_sheet_items table exists
-- ==========================================
CREATE TABLE IF NOT EXISTS public.pull_sheet_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_sheet_id uuid NOT NULL,
  product_id uuid,
  inventory_item_id uuid,
  item_name text NOT NULL,
  qty_requested numeric NOT NULL DEFAULT 0,
  qty_pulled numeric NOT NULL DEFAULT 0,
  notes text,
  sort_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add missing columns if table already exists
ALTER TABLE public.pull_sheet_items
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS inventory_item_id uuid,
  ADD COLUMN IF NOT EXISTS item_name text,
  ADD COLUMN IF NOT EXISTS qty_requested numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_pulled numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS sort_index integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure constraints
ALTER TABLE public.pull_sheet_items
  ALTER COLUMN pull_sheet_id SET NOT NULL,
  ALTER COLUMN item_name SET NOT NULL,
  ALTER COLUMN qty_requested SET NOT NULL,
  ALTER COLUMN qty_requested SET DEFAULT 0,
  ALTER COLUMN qty_pulled SET NOT NULL,
  ALTER COLUMN qty_pulled SET DEFAULT 0,
  ALTER COLUMN sort_index SET NOT NULL,
  ALTER COLUMN sort_index SET DEFAULT 0,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

-- ==========================================
-- STEP 3: Add foreign key constraints
-- ==========================================

-- Link pull_sheets to jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pull_sheets_job_id_fkey'
  ) THEN
    ALTER TABLE public.pull_sheets
      ADD CONSTRAINT pull_sheets_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Link pull_sheet_items to pull_sheets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pull_sheet_items_pull_sheet_id_fkey'
  ) THEN
    ALTER TABLE public.pull_sheet_items
      ADD CONSTRAINT pull_sheet_items_pull_sheet_id_fkey
      FOREIGN KEY (pull_sheet_id) REFERENCES public.pull_sheets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Link pull_sheet_items to products (if products table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'pull_sheet_items_product_id_fkey'
    ) THEN
      ALTER TABLE public.pull_sheet_items
        ADD CONSTRAINT pull_sheet_items_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Link pull_sheet_items to inventory_items (if inventory_items table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_items') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'pull_sheet_items_inventory_item_id_fkey'
    ) THEN
      ALTER TABLE public.pull_sheet_items
        ADD CONSTRAINT pull_sheet_items_inventory_item_id_fkey
        FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- ==========================================
-- STEP 4: Create indexes for performance
-- ==========================================
CREATE INDEX IF NOT EXISTS pull_sheets_job_id_idx ON public.pull_sheets(job_id);
CREATE INDEX IF NOT EXISTS pull_sheets_status_idx ON public.pull_sheets(status);
CREATE INDEX IF NOT EXISTS pull_sheets_code_idx ON public.pull_sheets(code);

CREATE INDEX IF NOT EXISTS pull_sheet_items_pull_sheet_id_idx ON public.pull_sheet_items(pull_sheet_id);
CREATE INDEX IF NOT EXISTS pull_sheet_items_product_id_idx ON public.pull_sheet_items(product_id);
CREATE INDEX IF NOT EXISTS pull_sheet_items_inventory_item_id_idx ON public.pull_sheet_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS pull_sheet_items_sort_index_idx ON public.pull_sheet_items(sort_index);

-- ==========================================
-- STEP 5: Disable RLS and grant permissions
-- ==========================================
ALTER TABLE public.pull_sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pull_sheet_items DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users
GRANT ALL ON public.pull_sheets TO authenticated;
GRANT ALL ON public.pull_sheet_items TO authenticated;

-- Grant full access to service role
GRANT ALL ON public.pull_sheets TO service_role;
GRANT ALL ON public.pull_sheet_items TO service_role;

-- Grant usage on sequences if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'pull_sheets_id_seq') THEN
    GRANT USAGE, SELECT ON SEQUENCE public.pull_sheets_id_seq TO authenticated;
    GRANT USAGE, SELECT ON SEQUENCE public.pull_sheets_id_seq TO service_role;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'pull_sheet_items_id_seq') THEN
    GRANT USAGE, SELECT ON SEQUENCE public.pull_sheet_items_id_seq TO authenticated;
    GRANT USAGE, SELECT ON SEQUENCE public.pull_sheet_items_id_seq TO service_role;
  END IF;
END $$;

-- ==========================================
-- STEP 6: Add updated_at trigger
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pull_sheets_updated_at ON public.pull_sheets;
CREATE TRIGGER update_pull_sheets_updated_at
  BEFORE UPDATE ON public.pull_sheets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pull_sheet_items_updated_at ON public.pull_sheet_items;
CREATE TRIGGER update_pull_sheet_items_updated_at
  BEFORE UPDATE ON public.pull_sheet_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- STEP 7: Verify setup
-- ==========================================
DO $$
DECLARE
  pull_sheets_count integer;
  pull_sheet_items_count integer;
BEGIN
  SELECT COUNT(*) INTO pull_sheets_count FROM public.pull_sheets;
  SELECT COUNT(*) INTO pull_sheet_items_count FROM public.pull_sheet_items;
  
  RAISE NOTICE '✅ Pull Sheets Setup Complete!';
  RAISE NOTICE 'pull_sheets table: % rows', pull_sheets_count;
  RAISE NOTICE 'pull_sheet_items table: % rows', pull_sheet_items_count;
  RAISE NOTICE 'Job linking: Enabled (job_id → jobs.id)';
  RAISE NOTICE 'RLS: Disabled (full access granted)';
  RAISE NOTICE 'Permissions: Granted to authenticated and service_role';
END $$;
