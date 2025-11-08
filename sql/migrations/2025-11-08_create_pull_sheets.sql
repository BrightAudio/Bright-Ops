-- Create pull sheet tables for warehouse workflows
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.pull_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT (
    'PS-' || to_char(now(), 'YYMMDDHH24MISS') || '-' || substr(gen_random_uuid()::text, 1, 4)
  ),
  name text NOT NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  scheduled_out_at timestamptz,
  expected_return_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure columns exist when upgrading an older table definition
ALTER TABLE public.pull_sheets
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS job_id uuid,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS scheduled_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS expected_return_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.pull_sheets
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.pull_sheets
  ALTER COLUMN code SET DEFAULT (
    'PS-' || to_char(now(), 'YYMMDDHH24MISS') || '-' || substr(gen_random_uuid()::text, 1, 4)
  );

CREATE UNIQUE INDEX IF NOT EXISTS pull_sheets_code_key ON public.pull_sheets (code);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pull_sheets_job_id_fkey'
  ) THEN
    ALTER TABLE public.pull_sheets
      ADD CONSTRAINT pull_sheets_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;
  END IF;
END;
$$;

COMMENT ON TABLE public.pull_sheets IS 'Warehouse pull sheets generated per job or ad-hoc.';
COMMENT ON COLUMN public.pull_sheets.code IS 'Human-readable identifier (PS-YYMMDD-XXXX).';
COMMENT ON COLUMN public.pull_sheets.status IS 'Workflow status (draft, picking, finalized, etc).';

CREATE INDEX IF NOT EXISTS pull_sheets_job_id_idx ON public.pull_sheets(job_id);
CREATE INDEX IF NOT EXISTS pull_sheets_status_idx ON public.pull_sheets(status);

CREATE TABLE IF NOT EXISTS public.pull_sheet_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_sheet_id uuid NOT NULL REFERENCES public.pull_sheets(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  qty_requested numeric NOT NULL DEFAULT 0,
  qty_pulled numeric NOT NULL DEFAULT 0,
  notes text,
  sort_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure required columns exist when table pre-dates this migration
ALTER TABLE public.pull_sheet_items
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS item_name text;

ALTER TABLE public.pull_sheet_items
  ALTER COLUMN item_name SET NOT NULL;

ALTER TABLE public.pull_sheet_items
  ADD COLUMN IF NOT EXISTS qty_requested numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_pulled numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS sort_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON TABLE public.pull_sheet_items IS 'Line items on a pull sheet.';
COMMENT ON COLUMN public.pull_sheet_items.sort_index IS 'Manual ordering position for warehouse picking.';

CREATE INDEX IF NOT EXISTS pull_sheet_items_sheet_idx ON public.pull_sheet_items(pull_sheet_id);
CREATE INDEX IF NOT EXISTS pull_sheet_items_product_idx ON public.pull_sheet_items(product_id);
CREATE INDEX IF NOT EXISTS pull_sheet_items_inventory_idx ON public.pull_sheet_items(inventory_item_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pull_sheets_set_updated_at ON public.pull_sheets;
CREATE TRIGGER pull_sheets_set_updated_at
BEFORE UPDATE ON public.pull_sheets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS pull_sheet_items_set_updated_at ON public.pull_sheet_items;
CREATE TRIGGER pull_sheet_items_set_updated_at
BEFORE UPDATE ON public.pull_sheet_items
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
