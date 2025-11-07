-- Complete schema migration matching types/database.ts
-- Generated: 2025-11-07 (FRESH START - drops existing tables)
-- WARNING: This migration DROPS and recreates all tables - all data will be lost!

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DROP ALL EXISTING TABLES (in correct order to handle foreign keys)
-- ============================================================================
DROP TABLE IF EXISTS public.sheet_items CASCADE;
DROP TABLE IF EXISTS public.sheets CASCADE;
DROP TABLE IF EXISTS public.scans CASCADE;
DROP TABLE IF EXISTS public.serials CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.transports CASCADE;
DROP TABLE IF EXISTS public.return_manifest CASCADE;
DROP TABLE IF EXISTS public.prep_sheet_items CASCADE;
DROP TABLE IF EXISTS public.prep_sheets CASCADE;
DROP TABLE IF EXISTS public.scan_events CASCADE;
DROP TABLE IF EXISTS public.inventory_movements CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;

-- ============================================================================
-- TABLE: inventory_items
-- ============================================================================
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT NOT NULL,
  name TEXT NOT NULL,
  qty_in_warehouse INTEGER DEFAULT 0,
  quantity_on_hand INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inventory_items_barcode ON public.inventory_items(barcode);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to inventory_items" ON public.inventory_items FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: inventory_movements
-- ============================================================================
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL,
  direction TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inventory_movements_item_id ON public.inventory_movements(item_id);
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to inventory_movements" ON public.inventory_movements FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: scan_events
-- ============================================================================
CREATE TABLE public.scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT NOT NULL,
  result TEXT NOT NULL,
  job_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scan_events_barcode ON public.scan_events(barcode);
CREATE INDEX idx_scan_events_job_id ON public.scan_events(job_id);
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to scan_events" ON public.scan_events FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: clients
-- ============================================================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to clients" ON public.clients FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: jobs
-- ============================================================================
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  title TEXT,
  status TEXT,
  client TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_jobs_code ON public.jobs(code);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to jobs" ON public.jobs FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: prep_sheets
-- ============================================================================
CREATE TABLE public.prep_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prep_sheets_job_id ON public.prep_sheets(job_id);
ALTER TABLE public.prep_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to prep_sheets" ON public.prep_sheets FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: prep_sheet_items
-- ============================================================================
CREATE TABLE public.prep_sheet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prep_sheet_id UUID REFERENCES public.prep_sheets(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  required_qty INTEGER DEFAULT 0,
  picked_qty INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prep_sheet_items_prep_sheet_id ON public.prep_sheet_items(prep_sheet_id);
CREATE INDEX idx_prep_sheet_items_inventory_item_id ON public.prep_sheet_items(inventory_item_id);
ALTER TABLE public.prep_sheet_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to prep_sheet_items" ON public.prep_sheet_items FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: return_manifest
-- ============================================================================
CREATE TABLE public.return_manifest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_return_manifest_job_id ON public.return_manifest(job_id);
ALTER TABLE public.return_manifest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to return_manifest" ON public.return_manifest FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: transports
-- ============================================================================
CREATE TABLE public.transports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  type TEXT,
  scheduled_at TIMESTAMPTZ,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transports_job_id ON public.transports(job_id);
ALTER TABLE public.transports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to transports" ON public.transports FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: products
-- ============================================================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE,
  name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_sku ON public.products(sku);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to products" ON public.products FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: serials
-- ============================================================================
CREATE TABLE public.serials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  barcode TEXT UNIQUE,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_serials_barcode ON public.serials(barcode);
CREATE INDEX idx_serials_product_id ON public.serials(product_id);
ALTER TABLE public.serials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to serials" ON public.serials FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: scans
-- ============================================================================
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  serial_id UUID REFERENCES public.serials(id) ON DELETE SET NULL,
  direction TEXT,
  scanned_by TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scans_job_id ON public.scans(job_id);
CREATE INDEX idx_scans_serial_id ON public.scans(serial_id);
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to scans" ON public.scans FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: sheets
-- ============================================================================
CREATE TABLE public.sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  type TEXT,
  code TEXT UNIQUE,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sheets_job_id ON public.sheets(job_id);
CREATE INDEX idx_sheets_code ON public.sheets(code);
ALTER TABLE public.sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sheets" ON public.sheets FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- TABLE: sheet_items
-- ============================================================================
CREATE TABLE public.sheet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID REFERENCES public.sheets(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sheet_items_sheet_id ON public.sheet_items(sheet_id);
CREATE INDEX idx_sheet_items_product_id ON public.sheet_items(product_id);
ALTER TABLE public.sheet_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sheet_items" ON public.sheet_items FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
