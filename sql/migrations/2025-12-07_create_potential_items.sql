-- Create potential_items table
-- These are items that clients may need but don't pull from inventory
-- They can be used to populate pull sheets with item deficits

CREATE TABLE IF NOT EXISTS public.potential_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  category TEXT,
  subcategory TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster client lookups
CREATE INDEX IF NOT EXISTS idx_potential_items_client_id ON public.potential_items(client_id);

-- Enable RLS
ALTER TABLE public.potential_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow all access to potential_items" 
  ON public.potential_items 
  FOR ALL 
  TO public 
  USING (true) 
  WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_potential_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER potential_items_updated_at
  BEFORE UPDATE ON public.potential_items
  FOR EACH ROW
  EXECUTE FUNCTION update_potential_items_updated_at();

-- Add comment
COMMENT ON TABLE public.potential_items IS 'Items that clients may need but do not pull from inventory - used to populate pull sheet deficits';
