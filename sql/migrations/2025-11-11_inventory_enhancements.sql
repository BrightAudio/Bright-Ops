-- Inventory enhancements migration
-- Generated: 2025-11-11
-- Adds categorization, tagging, financial tracking, maintenance status, and image support

-- Add category and tag columns for organization
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add financial and maintenance fields
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS repair_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS maintenance_status TEXT DEFAULT 'operational',
ADD COLUMN IF NOT EXISTS speaker_test_data JSONB;

-- Create index on category for fast filtering
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category);

-- Create GIN index on tags array for fast tag searches
CREATE INDEX IF NOT EXISTS idx_inventory_items_tags ON public.inventory_items USING GIN(tags);

-- Create index on maintenance_status for filtering
CREATE INDEX IF NOT EXISTS idx_inventory_items_maintenance_status ON public.inventory_items(maintenance_status);

-- Add comments for documentation
COMMENT ON COLUMN public.inventory_items.category IS 'Equipment category (e.g., monitor wedges, tops, subs, amps, amprack, road cases, lights, uplights, field audio, column speakers)';
COMMENT ON COLUMN public.inventory_items.tags IS 'Array of tags for flexible categorization (e.g., mon, fill, sub)';
COMMENT ON COLUMN public.inventory_items.image_url IS 'URL to equipment image';
COMMENT ON COLUMN public.inventory_items.repair_cost IS 'Total repair costs incurred for this item';
COMMENT ON COLUMN public.inventory_items.maintenance_status IS 'Current maintenance status: operational, needs_repair, in_repair, retired';
COMMENT ON COLUMN public.inventory_items.speaker_test_data IS 'JSON data for speaker test results and specifications';

-- ============================================================================
-- TABLE: rig_containers
-- ============================================================================
-- Create rig containers table for preset equipment groupings
CREATE TABLE IF NOT EXISTS public.rig_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for rig_containers
ALTER TABLE public.rig_containers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to rig_containers" ON public.rig_containers;
CREATE POLICY "Allow all access to rig_containers"
  ON public.rig_containers
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TABLE: rig_container_items
-- ============================================================================
-- Junction table for rig containers and inventory items
CREATE TABLE IF NOT EXISTS public.rig_container_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rig_container_id UUID NOT NULL REFERENCES public.rig_containers(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rig_container_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_rig_container_items_rig_id ON public.rig_container_items(rig_container_id);
CREATE INDEX IF NOT EXISTS idx_rig_container_items_inventory_id ON public.rig_container_items(inventory_item_id);

-- RLS for rig_container_items
ALTER TABLE public.rig_container_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to rig_container_items" ON public.rig_container_items;
CREATE POLICY "Allow all access to rig_container_items"
  ON public.rig_container_items
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.rig_containers IS 'Preset equipment groupings (rigs) that can be sent out together';
COMMENT ON TABLE public.rig_container_items IS 'Items assigned to each rig container';
