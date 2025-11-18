-- Verify and create prep_sheets and prep_sheet_items tables

-- Check if prep_sheets table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'prep_sheets'
);

-- Check if prep_sheet_items table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'prep_sheet_items'
);

-- Create prep_sheets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.prep_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create prep_sheet_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.prep_sheet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prep_sheet_id UUID REFERENCES public.prep_sheets(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  required_qty INTEGER DEFAULT 0,
  picked_qty INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prep_sheets_job_id ON public.prep_sheets(job_id);
CREATE INDEX IF NOT EXISTS idx_prep_sheet_items_prep_sheet_id ON public.prep_sheet_items(prep_sheet_id);
CREATE INDEX IF NOT EXISTS idx_prep_sheet_items_inventory_item_id ON public.prep_sheet_items(inventory_item_id);

-- Enable RLS
ALTER TABLE public.prep_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prep_sheet_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all access to prep_sheets" ON public.prep_sheets;
DROP POLICY IF EXISTS "Allow all access to prep_sheet_items" ON public.prep_sheet_items;

-- Create policies (allow all access for now)
CREATE POLICY "Allow all access to prep_sheets" 
  ON public.prep_sheets 
  FOR ALL 
  TO public 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow all access to prep_sheet_items" 
  ON public.prep_sheet_items 
  FOR ALL 
  TO public 
  USING (true) 
  WITH CHECK (true);

-- Verify columns in prep_sheet_items
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'prep_sheet_items'
ORDER BY ordinal_position;
