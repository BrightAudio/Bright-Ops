-- Complete pull sheets setup - Run ALL of this in Supabase SQL Editor
-- This will create tables and grant permissions

-- 1. Create the tables
CREATE TABLE IF NOT EXISTS pull_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name text NOT NULL,
  job_id uuid,
  status text NOT NULL DEFAULT 'draft',
  scheduled_out_at timestamptz,
  expected_return_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pull_sheet_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_sheet_id uuid NOT NULL REFERENCES pull_sheets(id) ON DELETE CASCADE,
  inventory_item_id uuid,
  item_name text NOT NULL,
  qty_requested numeric NOT NULL DEFAULT 0,
  qty_pulled numeric NOT NULL DEFAULT 0,
  notes text,
  sort_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Disable RLS completely
ALTER TABLE pull_sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE pull_sheet_items DISABLE ROW LEVEL SECURITY;

-- 3. Grant permissions to authenticated users
GRANT ALL ON pull_sheets TO authenticated;
GRANT ALL ON pull_sheet_items TO authenticated;

-- 4. Grant permissions to service role (just in case)
GRANT ALL ON pull_sheets TO service_role;
GRANT ALL ON pull_sheet_items TO service_role;

-- 5. Verify tables exist
SELECT 'pull_sheets table exists' FROM pull_sheets LIMIT 0;
SELECT 'pull_sheet_items table exists' FROM pull_sheet_items LIMIT 0;
