# Desktop Strategy Implementation - LOCKED ✅

**Date**: February 24, 2026  
**Status**: Foundation Complete - Ready for Phase 1 Build  
**Strategy**: Electron + SQLite + Sync Layer (Outbox Pattern)

---

## 🎯 CEO-Level Decision (APPROVED)

### Architecture Decision
✅ **Electron** (not Tauri)
- Windows-first reliability
- Native printing support  
- USB barcode scanner support
- Auto-updates built-in
- Mature ecosystem

✅ **SQLite** (not PostgreSQL)
- Portable (single file)
- Perfect for laptops
- Fast offline access
- Easy backups/restore
- No server needed

✅ **Sync Layer** (not migration)
- Keep web app on Supabase
- Desktop uses local SQLite
- Both work independently
- Changes sync bidirectionally when online
- "Last write wins" conflict resolution (MVP)

### Key Principle
**ONE PRODUCT, TWO MODES**
- Web: Cloud-based for central operations
- Desktop: Local for warehouse teams
- Data model: Identical (shared repositories)
- UI: Reused (no redesign)

---

## 📊 Foundation Built (9 Files)

### 1. Architecture Documentation
- ✅ **DESKTOP_STRATEGY.md** - Complete strategy + workflows
- ✅ **PHASE_1_CHECKLIST.md** - Implementation roadmap

### 2. Repository Pattern (Abstraction Layer)
- ✅ **db/repositories/base.ts** - Base interface + environment detection
- ✅ **db/repositories/InventoryRepo.ts** - Inventory interface
- ✅ **db/repositories/InventorySupabaseRepository.ts** - Web implementation
- → **db/repositories/InventorySqliteRepository.ts** - Desktop (next)
- → **db/repositories/PullSheetRepo.ts** - Pull sheet interface (next)

### 3. Desktop Database Layer
- ✅ **desktop/db/schema.sql** - SQLite schema (inventory, jobs, pull sheets, outbox)
- ✅ **desktop/db/sqlite.ts** - SQLite client with migration runner
- → **desktop/db/migrations.ts** - Migration executor (next)

### 4. Electron Framework
- ✅ **desktop/main.ts** - Electron main process (window creation, lifecycle)
- ✅ **desktop/preload.ts** - Secure IPC bridge (exposed to React)
- → **desktop/ipc/inventory.ts** - Inventory handlers (next)
- → **desktop/ipc/pullsheets.ts** - Pull sheet handlers (next)
- → **desktop/ipc/sync.ts** - Sync handlers (next)

### 5. Offline-First Pattern
- ✅ **db/outbox/types.ts** - Outbox data types + helpers
- → **db/outbox/OutboxWriter.ts** - Capture changes (next)
- → **db/outbox/OutboxSync.ts** - Push to Supabase (next)

---

## 🔧 How It Works (System Design)

### User Opens Pull Sheet (Warehouse)

```
Offline ❌ Internet
    ↓
Electron App
    ↓
React Component: "Get Inventory"
    ↓
useRepository(inventory)
    ↓
isDesktop() ? SQLiteRepo : SupabaseRepo
    ↓
SQLiteRepo.list()
    ↓
SELECT * FROM inventory_items (local SQLite)
    ↓
Returns data instantly (no network latency)
    ↓
User scans barcode → finds item
    ↓
"Checkout Item" clicked
    ↓
SQLiteRepo.checkoutItem(id, qty)
    ↓
1. UPDATE pull_sheet_items SET qty_checked_out = qty
2. INSERT INTO changes_outbox (operation: UPDATE, record_id, new_values)
3. Return updated item
    ↓
UI shows item checked out ✅
    ↓
Outbox queue now has 1 pending change
```

### User Syncs When Online

```
Online ✅ Internet
    ↓
User clicks "Sync Now"
    ↓
OutboxSync.syncNow()
    ↓
1. Read all rows from changes_outbox WHERE synced_at IS NULL
2. For each:
   - POST to /api/sync/changes
   - Include: table_name, operation, record_id, old_values, new_values
   ↓
API validates & writes to Supabase
   ↓
API returns: success, server_timestamp
   ↓
Desktop marks outbox rows: synced_at = now()
   ↓
OutboxSync.pullLatest()
   ↓
GET /api/sync/changes?since=lastSyncTime
   ↓
API returns changes from other users/web app
   ↓
Desktop updates local tables
   ↓
"Sync complete ✅" shown to user
```

### Web App Sees Desktop Changes

```
Desktop synced changes to Supabase
    ↓
Warehouse team member opens web app
    ↓
Pull sheet page loads
    ↓
React calls InventorySupabaseRepository.list()
    ↓
Supabase returns latest inventory
    ↓
Web app shows updated qty_in_warehouse
    ↓
No manual refresh needed (changes visible)
```

---

## 🏗️ Data Model (Locked)

### Core Tables
```
inventory_items
├── id, name, barcode
├── qty_in_warehouse (key field for sync)
├── category, location, unit_value
└── synced BOOLEAN

pull_sheets
├── id, name, code, job_id, status
└── synced BOOLEAN

pull_sheet_items
├── id, pull_sheet_id, inventory_item_id
├── qty_requested, qty_checked_out, qty_returned, status
└── synced BOOLEAN

jobs
├── id, code, title, status
├── start_at, end_at, income, labor_cost
└── synced BOOLEAN

changes_outbox  ← KEY FOR OFFLINE
├── id, table_name, operation (INSERT/UPDATE/DELETE)
├── record_id, old_values (JSON), new_values (JSON)
├── created_at, synced_at, sync_attempts, error
└── Used to track all changes for sync
```

---

## 🚀 Phase 1 Timeline (3 Weeks)

### Week 1: Database & Repositories
- Day 1-2: SQLite migrations runner + IPC handlers
- Day 3-4: InventorySqliteRepository + PullSheetRepository
- Day 5: Testing + UI integration

### Week 2: Offline Workflows  
- Day 6-7: Outbox writer + sync handler
- Day 8: API endpoint (/api/sync/changes)
- Day 9: Barcode scanning flows (checkout + return)

### Week 3: Polish & Packaging
- Day 10-12: Testing (offline, online, conflicts)
- Day 13: Electron installer build
- Day 14: User acceptance testing

**Deliverable**: Working warehouse MVP on desktop  
**Users**: Warehouse team tests checkout/return offline, syncs online

---

## 💰 Revenue Impact (Phase 1)

✅ **Warehouse teams don't lose data** (offline works)  
✅ **No network latency** (local SQLite is instant)  
✅ **Prevents "lost" equipment** (barcode scanning offline)  
✅ **Reduces support costs** (users can resolve themselves)  
✅ **Foundation for premium tier** (enterprise desktop version)

---

## 🔐 Security Model

### Authentication
- Desktop uses device code flow + Supabase Auth
- No hardcoded passwords in app
- JWT tokens stored securely

### Data Isolation
- RLS policies still apply on Supabase side
- Desktop only syncs data user can access
- Outbox log provides audit trail

### IPC Security
- All calls go through preload script
- Renderer process CANNOT access filesystem directly
- Main process validates all requests
- Sandbox enabled

---

## 📋 Files Created So Far

```
bright-audio-app/
├── DESKTOP_STRATEGY.md                              ✅ Complete strategy
├── PHASE_1_CHECKLIST.md                            ✅ Implementation plan
├── db/
│   ├── repositories/
│   │   ├── base.ts                                 ✅ Base interface
│   │   ├── InventoryRepo.ts                        ✅ Inventory interface
│   │   ├── InventorySupabaseRepository.ts          ✅ Web implementation
│   │   └── InventorySqliteRepository.ts            📝 TODO (next)
│   └── outbox/
│       ├── types.ts                                ✅ Outbox types
│       ├── OutboxWriter.ts                         📝 TODO (next)
│       └── OutboxSync.ts                           📝 TODO (next)
└── desktop/
    ├── main.ts                                      ✅ Electron entry
    ├── preload.ts                                   ✅ IPC bridge
    ├── db/
    │   ├── schema.sql                              ✅ Database schema
    │   ├── sqlite.ts                               ✅ SQLite client
    │   └── migrations.ts                           📝 TODO (next)
    └── ipc/
        ├── inventory.ts                            📝 TODO (next)
        ├── pullsheets.ts                           📝 TODO (next)
        └── sync.ts                                 📝 TODO (next)
```

---

## 🎯 What's Next (Immediate)

### Sprint 1 (Next 48 Hours)
1. Add dependencies to package.json
   - `better-sqlite3`, `electron`, `electron-builder`, `electron-is-dev`
2. Create `desktop/db/migrations.ts`
3. Create `desktop/ipc/inventory.ts` 
4. Create `db/repositories/InventorySqliteRepository.ts`
5. Test: SQLite initializes + loads inventory

### Success Metric
- [ ] `npm run electron-dev` starts app
- [ ] App loads inventory from SQLite (no internet)
- [ ] Barcode scan finds items
- [ ] No errors in console

---

## ✅ Web App Unchanged

**IMPORTANT**: The web version continues as-is
- Still uses Supabase
- Still deploys to Vercel
- Still uses SupabaseInventoryRepository
- No breaking changes
- Desktop is a "new product mode" customers can opt into

---

## 🔗 Related Docs

- `DESKTOP_STRATEGY.md` - Full architecture + workflows
- `PHASE_1_CHECKLIST.md` - Day-by-day breakdown
- `db/repositories/base.ts` - Base interface
- `desktop/db/schema.sql` - Database design
- `desktop/preload.ts` - IPC methods available to React

---

## 📞 Questions?

**Q: Will this break the web app?**  
A: No. Web stays on Supabase. Desktop is completely separate. Repository pattern isolates them.

**Q: What if desktop users are offline?**  
A: They work fine. Outbox queues changes. When online, "Sync Now" pushes everything.

**Q: What if two users edit the same item?**  
A: MVP uses "last write wins". Phase 2 will add smarter conflict resolution.

**Q: How do we prevent data loss?**  
A: Outbox log captures everything. Sync attempts retry on failure. Desktop can export data.

---

**Status**: READY TO BUILD  
**Next Meeting**: After Sprint 1 (48 hours)  
**Target**: Phase 1 MVP in 3 weeks

🚀 Let's go!
