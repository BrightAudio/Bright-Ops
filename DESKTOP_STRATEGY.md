# Bright Audio Desktop Strategy

**Decision Date**: February 24, 2026  
**Strategy**: Electron + SQLite + Sync Layer + Repository Pattern  
**Status**: Approved - Implementation Starting

---

## 🎯 Core Strategy (CEO Approved)

### Desktop Stack
- **Framework**: Electron (Windows-first, printing, USB scanners, filesystem)
- **Local DB**: SQLite (offline, portable, simple backups)
- **Sync Layer**: Outbox pattern + manual sync button (MVP)
- **UI**: Reuse Next.js pages (no rebuild)
- **Web**: Unchanged (Vercel + Supabase)

### Key Principle: Keep Everything Running

```
Web App (unchanged)
├── Vercel deployment
├── Supabase cloud DB
└── Vercel API routes

Desktop App (new)
├── Electron wrapper
├── Local Next server
├── SQLite local DB
└── Sync worker (outbox pattern)

Bridge
└── Repository abstraction layer (web uses Supabase, desktop uses SQLite)
```

---

## 📋 Phase 1: Proof of Desktop (1-2 Core Flows)

**Goal**: Show warehouse MVP works offline with barcode scanning.

### Deliverables
1. ✅ Electron wrapper (loads Next.js locally)
2. ✅ SQLite database initialization
3. ✅ Inventory list from SQLite
4. ✅ Barcode scan → Pull Sheet checkout
5. ✅ Barcode scan → Return checkin
6. ✅ Manual "Sync Now" button

### Timeline
- Setup: 2 days
- Core flow: 3-4 days
- Testing: 1-2 days

---

## 🔧 Immediate Checklist (Do This Now)

### Step 1: Create Desktop Infrastructure
- [ ] `desktop/` folder structure
- [ ] `desktop/main.ts` - Electron main process
- [ ] `desktop/preload.ts` - Secure IPC bridge
- [ ] `electron-builder.config.ts` - Packaging config

### Step 2: Database Layer
- [ ] `db/sqlite.ts` - SQLite client
- [ ] `db/migrations/` - Migration runner
- [ ] `db/schema.sql` - Initial schema
- [ ] Initialize tables on first launch

### Step 3: Repository Abstraction
- [ ] `lib/repositories/base.ts` - Base interface
- [ ] `lib/repositories/InventoryRepo.ts` - Interface
- [ ] `lib/repositories/InventorySupabaseRepo.ts` - Web implementation
- [ ] `lib/repositories/InventorySqliteRepo.ts` - Desktop implementation
- [ ] `lib/repositories/PullSheetRepo.ts` - Interface + implementations

### Step 4: Outbox Pattern
- [ ] `db/tables/changes_outbox.sql` - Outbox table
- [ ] `lib/outbox/OutboxWriter.ts` - Write to outbox
- [ ] `lib/outbox/OutboxSync.ts` - Push to Supabase
- [ ] "Sync Now" button in UI

### Step 5: Core Flows
- [ ] Inventory list page (use repository, works offline)
- [ ] Pull sheet checkout (scan barcode, check-out item, write to outbox)
- [ ] Return manifest (scan barcode, check-in item, write to outbox)
- [ ] Add to Electron preload methods

---

## 📊 Data Model (Locked)

### Core Tables for Desktop MVP

```sql
-- Inventory (replicated from Supabase)
CREATE TABLE inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  qty_in_warehouse INTEGER DEFAULT 0,
  category TEXT,
  location TEXT,
  unit_value REAL,
  updated_at TIMESTAMP,
  synced BOOLEAN DEFAULT 0
);

-- Pull Sheets
CREATE TABLE pull_sheets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  job_id TEXT,
  status TEXT,
  scheduled_out_at TIMESTAMP,
  expected_return_at TIMESTAMP,
  created_at TIMESTAMP,
  synced BOOLEAN DEFAULT 0
);

-- Pull Sheet Items (checkout tracking)
CREATE TABLE pull_sheet_items (
  id TEXT PRIMARY KEY,
  pull_sheet_id TEXT NOT NULL,
  inventory_item_id TEXT NOT NULL,
  qty_requested INTEGER,
  qty_checked_out INTEGER DEFAULT 0,
  qty_returned INTEGER DEFAULT 0,
  status TEXT,
  synced BOOLEAN DEFAULT 0,
  FOREIGN KEY (pull_sheet_id) REFERENCES pull_sheets(id)
);

-- Outbox (capture all changes for sync)
CREATE TABLE changes_outbox (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
  record_id TEXT NOT NULL,
  old_values JSON,
  new_values JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP,
  sync_attempts INTEGER DEFAULT 0,
  error TEXT
);

-- Jobs (for pull sheet context)
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT,
  start_at TIMESTAMP,
  end_at TIMESTAMP,
  income REAL,
  labor_cost REAL,
  created_at TIMESTAMP,
  synced BOOLEAN DEFAULT 0
);
```

---

## 🔄 Sync Flow

### Outbox Pattern
```
User Action (offline)
  ↓
Update local table + Write to outbox
  ↓
UI shows change immediately
  ↓
[When online]
  ↓
"Sync Now" clicked
  ↓
Read outbox entries
  ↓
Push to Supabase API
  ↓
If success: mark synced_at, increment sync_attempts
  ↓
If error: capture error, allow retry
  ↓
Pull latest from Supabase (sync down)
  ↓
Update local tables
```

### Conflict Rule (MVP)
- Last write wins
- No complex merging yet
- Log conflicts for later analysis

---

## 🏗️ Repository Pattern

### Interface (Shared)
```typescript
// lib/repositories/InventoryRepo.ts
export interface IInventoryRepository {
  list(): Promise<InventoryItem[]>;
  getById(id: string): Promise<InventoryItem | null>;
  create(item: InventoryItem): Promise<InventoryItem>;
  update(id: string, changes: Partial<InventoryItem>): Promise<InventoryItem>;
  searchByBarcode(barcode: string): Promise<InventoryItem | null>;
}
```

### Web Implementation
```typescript
// lib/repositories/InventorySupabaseRepo.ts
export class InventorySupabaseRepository implements IInventoryRepository {
  async list() {
    return supabase.from('inventory_items').select('*');
  }
  // ...
}
```

### Desktop Implementation
```typescript
// lib/repositories/InventorySqliteRepository.ts
export class InventorySqliteRepository implements IInventoryRepository {
  async list() {
    return db.query('SELECT * FROM inventory_items');
  }
  // ...
}
```

### Runtime Switch
```typescript
// lib/repositories/index.ts
export function getInventoryRepo(): IInventoryRepository {
  if (isDesktop()) {
    return new InventorySqliteRepository();
  }
  return new InventorySupabaseRepository();
}
```

---

## 🔌 Electron IPC Methods (Desktop)

Secure preload methods for React to call:

```typescript
// desktop/preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  // Inventory
  inventory: {
    list: () => ipcRenderer.invoke('inventory:list'),
    searchByBarcode: (barcode) => ipcRenderer.invoke('inventory:searchByBarcode', barcode),
    checkout: (itemId, qty) => ipcRenderer.invoke('inventory:checkout', itemId, qty),
  },
  // Pull Sheets
  pullsheets: {
    list: () => ipcRenderer.invoke('pullsheets:list'),
    checkoutItem: (psId, itemId, qty) => ipcRenderer.invoke('pullsheets:checkoutItem', psId, itemId, qty),
    returnItem: (psId, itemId, qty) => ipcRenderer.invoke('pullsheets:returnItem', psId, itemId, qty),
  },
  // Sync
  sync: {
    syncNow: () => ipcRenderer.invoke('sync:syncNow'),
    getStatus: () => ipcRenderer.invoke('sync:getStatus'),
  },
  // App info
  app: {
    isOffline: () => ipcRenderer.invoke('app:isOffline'),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },
});
```

---

## ✅ Success Criteria (Phase 1)

- [ ] Electron app boots and loads Next.js
- [ ] SQLite tables initialize on first launch
- [ ] User can view inventory (no internet needed)
- [ ] User can scan barcode → item loads
- [ ] User can checkout item to pull sheet (writes to outbox)
- [ ] User can return item (writes to outbox)
- [ ] "Sync Now" button pushes changes to Supabase
- [ ] Web app still works unchanged
- [ ] No breaking changes to existing flows

---

## 🚨 Non-Goals (Phase 1)

- ❌ Automatic sync
- ❌ Conflict resolution (beyond "last write wins")
- ❌ Printing/PDFs
- ❌ Auto-updates
- ❌ Role-based desktop permissions
- ❌ Advanced offline notifications

These come in Phase 2+.

---

## 📁 New Folder Structure

```
bright-audio-app/
├── desktop/                          # NEW: Electron wrapper
│   ├── main.ts                       # Electron main process
│   ├── preload.ts                    # Secure IPC bridge
│   ├── ipc/                          # IPC handlers
│   │   ├── inventory.ts              # Inventory IPC
│   │   ├── pullsheets.ts             # Pull sheet IPC
│   │   └── sync.ts                   # Sync IPC
│   └── db/                           # Local database
│       ├── sqlite.ts                 # SQLite client
│       ├── migrations.ts             # Migration runner
│       └── schema.sql                # Schema definitions
├── db/                               # NEW: Repository layer
│   ├── repositories/
│   │   ├── base.ts                   # Base interface
│   │   ├── InventoryRepo.ts          # Inventory interface
│   │   ├── InventorySupabaseRepo.ts  # Web implementation
│   │   ├── InventorySqliteRepo.ts    # Desktop implementation
│   │   ├── PullSheetRepo.ts          # Pull sheet interface
│   │   └── ...
│   └── outbox/
│       ├── OutboxWriter.ts           # Write changes
│       ├── OutboxSync.ts             # Push to Supabase
│       └── types.ts
├── app/
│   ├── api/
│   │   └── sync/                     # NEW: Sync endpoint for desktop
│   │       └── route.ts
│   └── app/
│       ├── warehouse/
│       │   ├── pull-sheets/
│       │   └── returns/
│       └── ...
└── ...
```

---

## 🚀 Implementation Order

**Week 1:**
1. Set up Electron scaffold + preload
2. Add SQLite + migrations
3. Create InventoryRepo interface + implementations
4. Test inventory list on desktop

**Week 2:**
1. Create PullSheetRepo
2. Implement checkout/return flows
3. Add outbox table + OutboxWriter
4. Build Sync handler

**Week 3:**
1. Add "Sync Now" UI button
2. Test end-to-end: checkout → sync → verify in web
3. Build initial installer
4. User testing

---

## 📌 Key Files to Create (Next)

1. `desktop/main.ts` - Electron entry point
2. `desktop/preload.ts` - IPC security bridge
3. `desktop/db/sqlite.ts` - Database client
4. `db/repositories/InventoryRepo.ts` - Repository interface
5. `db/outbox/types.ts` - Outbox types

---

## 🔒 Security Notes

- Never expose filesystem directly to renderer
- All DB access through IPC handlers
- Preload script validates all calls
- Outbox logs all changes for audit trail
- Desktop version still uses Supabase for auth (use device code flow)

---

## 💰 Revenue Impact

Once Phase 1 is done:

- ✅ Warehouse teams never lose data (offline works)
- ✅ Faster checkout/return (local DB, no network lag)
- ✅ Eliminates "lost" equipment (barcode scanning offline)
- ✅ Can charge premium for "enterprise" desktop version
- ✅ Reduces support costs (users can sync manually)

---

**Status**: Ready to build  
**Next**: Start with `desktop/main.ts` and SQLite setup
