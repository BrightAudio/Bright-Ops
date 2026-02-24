# PHASE 1 Implementation Checklist

**Status**: In Progress  
**Week**: 1 of 3  
**Date Started**: February 24, 2026

---

## ✅ Foundation (COMPLETED)

- [x] Create repository abstraction layer
- [x] Define InventoryRepo interface
- [x] Implement InventorySupabaseRepository (web)
- [x] Create outbox types
- [x] Design SQLite schema
- [x] Create SQLite client with migrations
- [x] Create Electron main process
- [x] Create preload (IPC security bridge)
- [x] Create DESKTOP_STRATEGY.md

---

## 🚀 Phase 1.1: Desktop SQLite Setup (Next Sprint)

### Desktop Database Layer
- [ ] Create `desktop/db/migrations.ts` - migration runner
- [ ] Create `desktop/ipc/inventory.ts` - inventory IPC handlers
- [ ] Create `desktop/ipc/pullsheets.ts` - pull sheet IPC handlers
- [ ] Create `desktop/ipc/sync.ts` - sync IPC handlers
- [ ] Test: SQLite initializes on first launch
- [ ] Test: Tables created correctly
- [ ] Test: IPC methods callable from React

### Update package.json
```json
{
  "devDependencies": {
    "electron": "^latest",
    "electron-builder": "^latest",
    "electron-is-dev": "^1.2.0",
    "better-sqlite3": "^9.0.0"
  },
  "scripts": {
    "electron": "electron .",
    "electron-dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
    "electron-build": "npm run build && electron-builder"
  }
}
```

---

## 🔄 Phase 1.2: Repository Implementation (Days 3-4)

### SQLite Inventory Repository
- [ ] Create `db/repositories/InventorySqliteRepository.ts`
  - [ ] list()
  - [ ] getById()
  - [ ] create()
  - [ ] update()
  - [ ] delete()
  - [ ] searchByBarcode()
  - [ ] searchByName()
  - [ ] checkoutItem()
  - [ ] returnItem()
- [ ] Create `db/repositories/index.ts` - Runtime selector
- [ ] Test: Both Supabase and SQLite repos work

### Create Pull Sheet Repository
- [ ] Create `db/repositories/PullSheetRepo.ts` - Interface
- [ ] Create `db/repositories/PullSheetSupabaseRepository.ts` - Web
- [ ] Create `db/repositories/PullSheetSqliteRepository.ts` - Desktop
- [ ] Methods:
  - [ ] list()
  - [ ] getById()
  - [ ] create()
  - [ ] addItem()
  - [ ] checkoutItem()
  - [ ] returnItem()
  - [ ] markComplete()

---

## 📱 Phase 1.3: Barcode Scanning Flow (Days 5-6)

### Existing UI (Reuse)
- [ ] Verify barcode scanning works on desktop
- [ ] Update `app/app/warehouse/pull-sheets/` to use repositories
- [ ] Update `app/app/warehouse/returns/` to use repositories
- [ ] Add offline indicator UI

### Checkout Flow
- [ ] User opens pull sheet on desktop
- [ ] User scans barcode
- [ ] System loads item from SQLite (no network needed)
- [ ] User confirms checkout qty
- [ ] System writes to pull_sheet_items table
- [ ] System writes to changes_outbox (mark as pending sync)
- [ ] UI updates immediately

### Return Flow
- [ ] Job complete, user scans items
- [ ] System finds pull sheet items by barcode
- [ ] User confirms return qty
- [ ] System updates qty_returned
- [ ] System writes to outbox
- [ ] UI updates immediately

---

## 💾 Phase 1.4: Outbox & Sync (Days 6-7)

### Outbox Writer
- [ ] Create `db/outbox/OutboxWriter.ts`
  - [ ] captureInsert()
  - [ ] captureUpdate()
  - [ ] captureDelete()
  - [ ] getPendingCount()
  - [ ] getAllPending()

### Outbox Sync
- [ ] Create `db/outbox/OutboxSync.ts`
  - [ ] syncNow()
  - [ ] pushChanges()
  - [ ] pullLatest()
  - [ ] handleConflict() - last write wins for MVP
  - [ ] logSync()

### API Endpoint
- [ ] Create `app/api/sync/changes/route.ts`
  - [ ] POST - Accept changes from desktop
  - [ ] Validate changes
  - [ ] Write to Supabase
  - [ ] Return success + server timestamp

### UI Components
- [ ] Add "Sync Now" button to dashboard
- [ ] Show sync status (pending, syncing, done)
- [ ] Show error messages
- [ ] Show last sync time

---

## 🧪 Phase 1.5: Testing & Integration (Days 7-8)

### End-to-End Test
- [ ] Desktop app boots
- [ ] SQLite initializes
- [ ] User opens inventory list
- [ ] User scans barcode → item found
- [ ] User checks out item → outbox capture
- [ ] User clicks "Sync Now"
- [ ] Changes pushed to Supabase
- [ ] Open web app → verify changes synced
- [ ] Make change in web app
- [ ] Pull latest in desktop
- [ ] Verify change appears locally

### Offline Test
- [ ] Close internet
- [ ] User still can checkout items
- [ ] Outbox queue builds up
- [ ] Reconnect internet
- [ ] Click "Sync Now"
- [ ] All changes push successfully

### UI Test
- [ ] Offline indicator shows
- [ ] Sync button disabled when offline
- [ ] Pull sheet page loads from cache
- [ ] Barcode scanning still works
- [ ] Inventory visible

---

## 📦 Phase 1.6: Packaging (Days 8-9)

### Electron Builder Config
- [ ] Create `electron-builder.config.ts`
- [ ] Configure for Windows NSIS installer
- [ ] Configure for macOS DMG
- [ ] Configure for Linux AppImage

### Build Process
- [ ] npm run electron-build
- [ ] Verify installer works
- [ ] Verify app updates on second launch
- [ ] Test uninstall

---

## ✨ Phase 1 Success Criteria

- [x] Architecture documented
- [x] Foundation built (preload, main, db client)
- [ ] SQLite initializes on first launch
- [ ] Both repos (Supabase + SQLite) implemented
- [ ] Pull sheet checkout works offline
- [ ] Return manifest works offline
- [ ] Barcode scanning works
- [ ] Outbox captures all changes
- [ ] "Sync Now" pushes to Supabase successfully
- [ ] Web app sees desktop changes
- [ ] Desktop pulls web changes
- [ ] Offline workflow fully tested
- [ ] Installer builds successfully
- [ ] No breaking changes to web app
- [ ] Product demo ready

---

## 📊 Progress Tracking

**Completed**: 12 files created  
**Remaining**: ~30 files to create/modify

### File Inventory
✅ Created:
- DESKTOP_STRATEGY.md
- db/repositories/base.ts
- db/repositories/InventoryRepo.ts
- db/repositories/InventorySupabaseRepository.ts
- db/outbox/types.ts
- desktop/db/schema.sql
- desktop/db/sqlite.ts
- desktop/main.ts
- desktop/preload.ts

📝 To Create:
- desktop/db/migrations.ts
- desktop/ipc/inventory.ts
- desktop/ipc/pullsheets.ts
- desktop/ipc/sync.ts
- db/repositories/InventorySqliteRepository.ts
- db/repositories/PullSheetRepo.ts
- db/repositories/PullSheetSupabaseRepository.ts
- db/repositories/PullSheetSqliteRepository.ts
- db/outbox/OutboxWriter.ts
- db/outbox/OutboxSync.ts
- app/api/sync/changes/route.ts
- electron-builder.config.ts
- More UI components and config

---

## 🔗 Dependencies to Add

```bash
npm install better-sqlite3 electron electron-builder electron-is-dev concurrently wait-on
npm install --save-dev @types/better-sqlite3
```

---

## 🎯 Next Actions (Start Now)

1. **Add dependencies** to package.json
2. **Create migrations runner** (desktop/db/migrations.ts)
3. **Create IPC handlers** (inventory, pullsheets, sync)
4. **Create SQLite repository** (InventorySqliteRepository.ts)
5. **Update components** to use repositories
6. **Test locally** in development mode

---

**Owner**: Bright Audio CEO  
**Timeline**: 3 weeks to Phase 1 complete  
**Target Launch**: Desktop MVP ready for warehouse testing
