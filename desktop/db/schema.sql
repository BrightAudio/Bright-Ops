-- Bright Audio Desktop SQLite Schema
-- Phase 1: Inventory, Pull Sheets, and Outbox

-- Inventory Items (replicated from Supabase)
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  qty_in_warehouse INTEGER DEFAULT 0,
  category TEXT,
  location TEXT,
  unit_value REAL,
  purchase_cost REAL,
  purchase_date TEXT,
  maintenance_status TEXT,
  repair_cost REAL,
  image_url TEXT,
  updated_at TEXT,
  synced BOOLEAN DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory_items(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory_items(location);

-- Jobs (for pull sheet context)
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  start_at TEXT,
  end_at TEXT,
  income REAL,
  labor_cost REAL,
  client_id TEXT,
  warehouse_id TEXT,
  created_at TEXT,
  updated_at TEXT,
  synced BOOLEAN DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_jobs_code ON jobs(code);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Pull Sheets
CREATE TABLE IF NOT EXISTS pull_sheets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  job_id TEXT,
  status TEXT DEFAULT 'draft',
  scheduled_out_at TEXT,
  expected_return_at TEXT,
  created_at TEXT,
  updated_at TEXT,
  synced BOOLEAN DEFAULT 0,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE INDEX IF NOT EXISTS idx_pull_sheets_job_id ON pull_sheets(job_id);
CREATE INDEX IF NOT EXISTS idx_pull_sheets_status ON pull_sheets(status);

-- Pull Sheet Items (checkout tracking)
CREATE TABLE IF NOT EXISTS pull_sheet_items (
  id TEXT PRIMARY KEY,
  pull_sheet_id TEXT NOT NULL,
  inventory_item_id TEXT NOT NULL,
  qty_requested INTEGER DEFAULT 0,
  qty_checked_out INTEGER DEFAULT 0,
  qty_returned INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  synced BOOLEAN DEFAULT 0,
  FOREIGN KEY (pull_sheet_id) REFERENCES pull_sheets(id),
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
);

CREATE INDEX IF NOT EXISTS idx_pull_sheet_items_pull_sheet ON pull_sheet_items(pull_sheet_id);
CREATE INDEX IF NOT EXISTS idx_pull_sheet_items_inventory ON pull_sheet_items(inventory_item_id);

-- Return Manifests (track returns from jobs)
CREATE TABLE IF NOT EXISTS return_manifests (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  pull_sheet_id TEXT,
  status TEXT DEFAULT 'pending',
  expected_return_date TEXT,
  created_at TEXT,
  updated_at TEXT,
  synced BOOLEAN DEFAULT 0,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (pull_sheet_id) REFERENCES pull_sheets(id)
);

CREATE INDEX IF NOT EXISTS idx_return_manifests_job_id ON return_manifests(job_id);

-- Outbox Pattern (capture all changes for sync)
CREATE TABLE IF NOT EXISTS changes_outbox (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id TEXT NOT NULL,
  old_values TEXT,  -- JSON string
  new_values TEXT,  -- JSON string
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  synced_at TEXT,
  sync_attempts INTEGER DEFAULT 0,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_outbox_synced ON changes_outbox(synced_at);
CREATE INDEX IF NOT EXISTS idx_outbox_table ON changes_outbox(table_name);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON changes_outbox(synced_at, sync_attempts) WHERE synced_at IS NULL;

-- Sync Log (track sync operations)
CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  sync_at TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT,  -- 'started', 'completed', 'failed'
  entries_pushed INTEGER,
  entries_pulled INTEGER,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status);
