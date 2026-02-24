# Phase 2: Sync Service Implementation - KICKOFF

## Status: ✅ Phase 1 Complete → Ready for Phase 2

### What Just Happened

You asked "what's the next step? do it." So I did:

1. ✅ **Started Electron App** - Web server running at localhost:3001
2. ✅ **Created Barcode Scanner Component** - Uses repository pattern
3. ✅ **Built E2E Test** - Verified entire warehouse workflow
4. ✅ **All Tests Passed** - Barcode scanning, checkout, return, outbox tracking working

### Test Results

```
🧪 BARCODE SCANNER E2E TEST: PASSED ✅

✓ Database initialized with SQLite
✓ 3 test items inserted with barcodes
✓ Barcode scan: SPEAKER001 → Found QSC K10.2 Speaker
✓ Barcode scan: CABLE-XLR-50 → Found XLR Cable
✓ Barcode scan: MIXER-QU16-001 → Found Mixer
✓ Barcode scan: NONEXISTENT → Not found (correct)
✓ Checkout 2 units: 8 → 6 (inventory reduced)
✓ Change recorded to outbox: UPDATE pending
✓ Return 1 unit: 6 → 7 (inventory increased)
✓ Change recorded to outbox: UPDATE pending
✓ Final inventory correct: 7 speakers, 25 cables, 2 mixers
```

---

## Phase 2 Goals (Next Steps)

### Phase 2.1: Create Sync API Endpoint
**Location:** `app/api/sync/changes/route.ts`

**What it does:**
- Receives POST from desktop app with pending changes
- Applies changes to Supabase
- Tracks sync success/failure
- Handles conflict resolution

**Signature:**
```typescript
POST /api/sync/changes
Body: {
  changes: [
    {
      id: string (uuid)
      table_name: 'inventory_items' | 'pull_sheets' | ...
      operation: 'INSERT' | 'UPDATE' | 'DELETE'
      record_id: string (uuid)
      old_values: JSON
      new_values: JSON
      created_at: ISO string
    }
  ]
}

Response: {
  success: boolean
  synced: number (how many succeeded)
  failed: number (how many failed)
  errors?: Array<{changeId, error}>
}
```

### Phase 2.2: Implement Sync Service
**Location:** `lib/sync/outboxSync.ts`

**What it does:**
- Reads pending changes from changes_outbox table (SQLite on desktop)
- Batches changes (max 100 per request)
- POSTs to `/api/sync/changes` endpoint
- Updates `synced_at` timestamp on success
- Retries on failure with exponential backoff
- Updates `sync_attempts` counter

**Key Functions:**
```typescript
async syncPending(): Promise<{synced, failed, errors}>
async syncChange(changeId): Promise<boolean>
async retryFailed(maxAttempts): Promise<void>
```

### Phase 2.3: Add Conflict Resolution
**Location:** `lib/sync/conflictResolver.ts`

**What it does:**
- If change was edited both on desktop AND web since last sync
- Detect conflict (two different `updated_at` timestamps)
- Strategies:
  - Last-write-wins (simple)
  - User chooses (show dialog)
  - Merge (for specific fields)

**Conflict Detection:**
```typescript
// On Supabase: check if record was updated since we last read it
const remoteVersion = await supabase
  .from('inventory_items')
  .select('updated_at')
  .eq('id', recordId)
  .single();

if (remoteVersion.updated_at > ourVersion.updated_at) {
  // Conflict! Remote was edited after our change
  return resolveConflict('last-write-wins'); // or show dialog
}
```

### Phase 2.4: Update Sync Hook
**Location:** `hooks/useSyncStatus.ts` (modify existing)

**Changes:**
- Currently: `sync:syncNow()` just records sync start
- New: `sync:syncNow()` actually calls `/api/sync/changes`
- Update UI to show progress: "Syncing... 45/100"
- Show errors in SyncStatusIndicator

### Phase 2.5: Integration Testing
**Create:** `test-full-sync-workflow.js`

**Test Scenarios:**
1. Create item on desktop → Sync → Verify on web
2. Create item on web → Show on desktop (next login)
3. Edit same item on both → Conflict resolution
4. Network interruption → Auto-retry
5. Sync while creating new item → Queue handling

---

## Architecture for Phase 2

```
Desktop (Offline Mode)
├─ Create/Edit inventory
├─ Changes recorded to changes_outbox table
└─ UI shows: "3 changes pending sync"

User clicks: "Sync Now" ↓

Desktop IPC Handler
├─ Reads: changes_outbox WHERE synced_at IS NULL
├─ Batches: max 100 changes
└─ POST to: /api/sync/changes

Web API Endpoint (/api/sync/changes)
├─ Validate authentication
├─ For each change:
│  ├─ Check for conflicts
│  ├─ Apply to Supabase
│  └─ Track success/failure
└─ Return: {synced: 45, failed: 2}

Desktop IPC Handler receives response
├─ Update: SET synced_at = NOW() for successful changes
├─ Update: sync_attempts++ for failed changes
└─ Show: "✅ Synced 45 changes!"

UI Updates
├─ SyncStatusIndicator refreshes
├─ Shows: "All synced ✅"
└─ User can continue working offline
```

---

## Implementation Priority

### Critical Path (Do First)
1. **Create `/api/sync/changes` endpoint** - Core sync
2. **Update `sync:syncNow()` to actually sync** - Makes sync work
3. **Add conflict detection** - Prevent data loss

### High Priority (Do Second)
4. **Retry logic with backoff** - Handle network issues
5. **Batch processing** - Performance with many changes
6. **Error tracking** - Show sync errors to user

### Nice-to-Have (Do Later)
7. **Auto-sync on interval** - Sync every 5 mins if connected
8. **Selective sync** - User picks which changes to sync
9. **Undo/Redo** - Revert synced changes if needed

---

## Files to Create/Modify

### New Files
```
lib/sync/outboxSync.ts                 Sync service
lib/sync/conflictResolver.ts           Conflict handling
app/api/sync/changes/route.ts          Sync endpoint
test-full-sync-workflow.js             Integration tests
PHASE_2_IMPLEMENTATION.md              Technical guide
```

### Modified Files
```
desktop/ipc/sync.ts                    Update syncNow() to call API
hooks/useSyncStatus.ts                 Show sync progress
lib/supabaseClient.ts                  Add sync endpoint calls
```

---

## Estimated Duration

| Task | Effort | Timeline |
|------|--------|----------|
| Create sync endpoint | 4 hours | Today |
| Implement sync service | 6 hours | Tomorrow |
| Add conflict resolution | 4 hours | Tomorrow |
| Integration testing | 4 hours | Day 3 |
| Bug fixes & polish | 2 hours | Day 3 |
| **Total** | **20 hours** | **3 days** |

---

## Success Criteria

✅ Desktop app can create change
✅ User clicks "Sync Now"
✅ Change POSTs to `/api/sync/changes`
✅ API applies to Supabase
✅ Desktop app confirms: "Synced ✅"
✅ Verify on web app: change is there
✅ Conflict handling works (show dialog or auto-resolve)
✅ Retry works (network back → auto-retry)

---

## Current Git State

```
Latest commits:
3d6e20a - Phase 2 Prep: Barcode Scanner component + E2E test
7a2cdcc - Add Phase 1 Completion Banner
25380b0 - Add Phase 1 Quick Reference Card
99b4ae5 - Phase 1 Complete: Desktop SQLite foundation
```

---

## What's Working Now

✅ **Desktop Foundation**
- SQLite database local
- IPC communication (19 handlers)
- Repository pattern abstraction

✅ **Barcode Scanning**
- Scanner component created
- Works with repository pattern
- Can query both SQLite (desktop) and Supabase (web)
- E2E test passes

✅ **Change Tracking**
- All operations logged to changes_outbox
- Changes have old_values and new_values
- Tracking synced_at and sync_attempts

❌ **Not Yet Working**
- Actual sync to Supabase
- Conflict resolution
- Retry logic
- Network interruption handling

---

## What's Needed for Phase 2

The infrastructure is complete. Now we need the **sync glue**:

1. **Backend:** API endpoint to receive changes
2. **Service:** Logic to apply changes to Supabase
3. **Conflict:** Detect & resolve conflicting edits
4. **UI:** Show sync progress and errors

---

## Next Command to Execute

```bash
# First, let me create the sync endpoint
```

Then:
1. Create `/api/sync/changes` endpoint (POST handler)
2. Test POST from desktop (manual curl first)
3. Verify changes apply to Supabase
4. Add conflict detection
5. Update sync hook to show progress

---

## Questions for You

Ready to start Phase 2? Any preferences?

1. **Conflict Strategy**: Last-write-wins (simple) or show dialog (user chooses)?
2. **Sync Timing**: Manual "Sync Now" button only, or also auto-sync every 5 mins?
3. **Testing**: Should I do manual curl tests first, or go straight to integration test?

Otherwise, I'm ready to build Phase 2! 🚀
