-- Create cost estimate line items table for itemized breakdowns
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.cost_estimate_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- 'equipment', 'labor', 'other'
  item_name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 2) DEFAULT 1,
  unit_cost DECIMAL(10, 2) DEFAULT 0,
  total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (COALESCE(quantity, 0) * COALESCE(unit_cost, 0)) STORED,
  rental_period TEXT, -- 'daily', 'weekly', 'monthly'
  role TEXT, -- For labor items: 'audio_tech', 'stage_manager', etc.
  is_editable BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cost_estimate_job_id ON public.cost_estimate_line_items(job_id);
CREATE INDEX IF NOT EXISTS idx_cost_estimate_item_type ON public.cost_estimate_line_items(item_type);
CREATE INDEX IF NOT EXISTS idx_cost_estimate_sort ON public.cost_estimate_line_items(job_id, sort_order);

-- Enable RLS
ALTER TABLE public.cost_estimate_line_items ENABLE ROW LEVEL SECURITY;

-- Create policy for full access (adjust later for proper permissions)
CREATE POLICY "Allow all access to cost_estimate_line_items" ON public.cost_estimate_line_items 
  FOR ALL TO public 
  USING (true) 
  WITH CHECK (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cost_estimate_line_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cost_estimate_line_items_updated_at
  BEFORE UPDATE ON public.cost_estimate_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cost_estimate_line_items_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.cost_estimate_line_items IS 'Itemized cost breakdown for job estimates and invoices';
COMMENT ON COLUMN public.cost_estimate_line_items.item_type IS 'Type: equipment (gear rental), labor (crew), or other';
COMMENT ON COLUMN public.cost_estimate_line_items.rental_period IS 'Rental period for equipment: daily, weekly, monthly';
COMMENT ON COLUMN public.cost_estimate_line_items.role IS 'Crew role for labor items';
COMMENT ON COLUMN public.cost_estimate_line_items.is_editable IS 'Whether the line item cost can be manually edited';
