# Phase 1.2: Repository Pattern Migration Guide

## Overview
Convert React components from direct Supabase queries to abstract repository pattern, enabling seamless web/desktop switching.

## Pattern: Before → After

### ❌ Before (Direct Supabase)
```typescript
import { supabase } from '@/lib/supabase';

export default function InventoryList() {
  const [items, setItems] = useState([]);
  
  useEffect(() => {
    // Direct Supabase query - only works on web
    supabase
      .from('inventory_items')
      .select('*')
      .order('name')
      .then(({ data }) => setItems(data || []))
      .catch(console.error);
  }, []);

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          {item.name} ({item.qty_in_warehouse})
        </div>
      ))}
    </div>
  );
}
```

**Problems:**
- ❌ Won't work on desktop (no Supabase access in Electron)
- ❌ Tight coupling to Supabase client
- ❌ Hard to test (need real Supabase connection)
- ❌ If Supabase goes down, app is broken on desktop

---

### ✅ After (Repository Pattern)
```typescript
import { useEffect, useState } from 'react';
import { getInventoryRepository } from '@/db/repositories';

export default function InventoryList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true);
        const repo = getInventoryRepository();
        const data = await repo.list();
        setItems(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          {item.name} ({item.qty_in_warehouse})
        </div>
      ))}
    </div>
  );
}
```

**Benefits:**
- ✅ Works on web (Supabase) AND desktop (SQLite)
- ✅ Loose coupling (repository abstraction)
- ✅ Easy to test (mock repository)
- ✅ Can work offline on desktop
- ✅ Same UI code for both platforms

---

## Step-by-Step Migration

### Step 1: Replace Direct Supabase Calls

**Pattern to Search For:**
```typescript
import { supabase } from '@/lib/supabase';

supabase
  .from('inventory_items')
  .select(...)
```

**Replace With:**
```typescript
import { getInventoryRepository } from '@/db/repositories';

const repo = getInventoryRepository();
const items = await repo.list();  // or getById, create, update, etc.
```

### Step 2: Handle Responses

**Supabase Response:**
```typescript
const { data, error } = await supabase
  .from('inventory_items')
  .select('*');

if (error) {
  console.error('Error:', error);
} else {
  setItems(data);
}
```

**Repository Response:**
```typescript
try {
  const repo = getInventoryRepository();
  const items = await repo.list();
  setItems(items);
} catch (error) {
  console.error('Error:', error);
}
```

### Step 3: Search Operations

#### Inventory Search by Barcode

**Before:**
```typescript
const { data } = await supabase
  .from('inventory_items')
  .select('*')
  .eq('barcode', '123456')
  .single();
```

**After:**
```typescript
const repo = getInventoryRepository();
const item = await repo.searchByBarcode('123456');
```

#### Inventory Search by Name

**Before:**
```typescript
const { data } = await supabase
  .from('inventory_items')
  .select('*')
  .ilike('name', `%${query}%`);
```

**After:**
```typescript
const repo = getInventoryRepository();
const items = await repo.searchByName(query);
```

### Step 4: Pull Sheets

**Before:**
```typescript
const { data: sheets } = await supabase
  .from('pull_sheets')
  .select('*, items:pull_sheet_items(*)')
  .eq('id', sheetId)
  .single();
```

**After:**
```typescript
const repo = getPullSheetRepository();
const sheet = await repo.getByIdWithItems(sheetId);
```

---

## Common Component Updates

### Inventory List Component

```typescript
'use client';
import { useEffect, useState } from 'react';
import { getInventoryRepository, IInventoryRepository } from '@/db/repositories';

export function InventoryList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const repo = getInventoryRepository();
        const data = await repo.list();
        setItems(data);
      } catch (error) {
        console.error('Failed to load inventory:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="grid gap-4 p-4">
      {items.map(item => (
        <div key={item.id} className="border p-4 rounded">
          <h3 className="font-bold">{item.name}</h3>
          <p>Barcode: {item.barcode}</p>
          <p>In Stock: {item.qty_in_warehouse}</p>
        </div>
      ))}
    </div>
  );
}
```

### Barcode Scanner Component

```typescript
'use client';
import { useState } from 'react';
import { getInventoryRepository } from '@/db/repositories';

export function BarcodeScanner() {
  const [barcode, setBarcode] = useState('');
  const [item, setItem] = useState(null);

  const handleScan = async (scannedBarcode: string) => {
    try {
      const repo = getInventoryRepository();
      // Works on web (Supabase) AND desktop (SQLite)
      const result = await repo.searchByBarcode(scannedBarcode);
      setItem(result);
    } catch (error) {
      console.error('Scan failed:', error);
    }
  };

  return (
    <div className="p-4">
      <input
        type="text"
        placeholder="Scan barcode..."
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleScan(barcode);
            setBarcode('');
          }
        }}
      />
      {item && (
        <div className="mt-4 p-4 border">
          <h3 className="font-bold">{item.name}</h3>
          <p>Available: {item.qty_in_warehouse}</p>
        </div>
      )}
    </div>
  );
}
```

### Pull Sheet Management

```typescript
'use client';
import { useEffect, useState } from 'react';
import { getPullSheetRepository } from '@/db/repositories';

export function PullSheetManager({ jobId }: { jobId: string }) {
  const [sheets, setSheets] = useState([]);

  useEffect(() => {
    const load = async () => {
      const repo = getPullSheetRepository();
      // On desktop: queries SQLite via IPC
      // On web: queries Supabase
      const data = await repo.getByJobId(jobId);
      setSheets(data);
    };
    load();
  }, [jobId]);

  return (
    <div>
      {sheets.map(sheet => (
        <div key={sheet.id} className="p-4 border rounded mb-2">
          <h4 className="font-bold">{sheet.venue_name}</h4>
          <p>Status: {sheet.status}</p>
          <p>Items: {sheet.items?.length || 0}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Files to Update

### High Priority (Core Workflows)
1. **Inventory Pages**
   - `app/warehouse/inventory/page.tsx` - Inventory listing
   - `app/warehouse/inventory/search.tsx` - Search component
   - `app/warehouse/barcode-scanner.tsx` - Barcode scanning

2. **Pull Sheet Pages**
   - `app/warehouse/pullsheets/page.tsx` - Pull sheet list
   - `app/warehouse/pullsheets/[id]/page.tsx` - Pull sheet detail
   - `app/warehouse/pullsheets/create.tsx` - Create new

3. **Checkout/Return Workflows**
   - `app/warehouse/checkout.tsx` - Equipment checkout
   - `app/warehouse/return.tsx` - Equipment return

### Medium Priority (Supporting Features)
4. **Inventory Management**
   - `app/admin/inventory/edit.tsx` - Edit item
   - `app/admin/inventory/add.tsx` - Add new item

5. **Reports**
   - Any component querying `inventory_items` or `pull_sheets`

### Automated Search
```bash
# Find all files using direct Supabase queries
grep -r "supabase.from('inventory_items')" app/
grep -r "supabase.from('pull_sheets')" app/
```

---

## Testing the Migration

### Unit Test Pattern
```typescript
import { describe, it, expect, vi } from 'vitest';
import { InventoryList } from '@/components/InventoryList';

describe('InventoryList with Repository', () => {
  it('should load items from repository', async () => {
    // Mock the repository
    vi.mock('@/db/repositories', () => ({
      getInventoryRepository: () => ({
        list: async () => [
          { id: '1', name: 'Speaker', qty_in_warehouse: 5 }
        ]
      })
    }));

    // Test loads without direct Supabase dependency
  });
});
```

### Integration Test Pattern
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { InventoryList } from '@/components/InventoryList';

it('works on both web and desktop', async () => {
  render(<InventoryList />);
  
  await waitFor(() => {
    expect(screen.getByText(/Speaker/)).toBeInTheDocument();
  });
  // Same test works for:
  // - Web running in browser (uses Supabase repo)
  // - Desktop running in Electron (uses SQLite repo via IPC)
});
```

---

## Benefits Summary

| Aspect | Direct Supabase | Repository Pattern |
|--------|-----------------|-------------------|
| **Web Only** | ✅ Yes | ✅ Yes (uses Supabase) |
| **Desktop** | ❌ No | ✅ Yes (uses SQLite) |
| **Offline Mode** | ❌ No | ✅ Yes (SQLite) |
| **Testing** | ❌ Hard | ✅ Easy (mock repo) |
| **Switching DB** | ❌ Hard | ✅ Easy (new repo impl) |
| **Code Reuse** | ❌ No | ✅ Yes (100%) |

---

## Rollout Plan

### Phase 1 (Week 1)
- [ ] Update barcode scanner (critical for warehouse MVP)
- [ ] Update inventory list page
- [ ] Update checkout workflow

### Phase 2 (Week 2)
- [ ] Update pull sheet pages
- [ ] Update return workflow
- [ ] Update edit/add inventory pages

### Phase 3 (Week 3)
- [ ] Update all admin pages
- [ ] Update all report pages
- [ ] Comprehensive testing

### Phase 4 (Week 4)
- [ ] Remove all direct Supabase imports from components
- [ ] Code review and cleanup
- [ ] Deploy to production

---

## Troubleshooting

### "Electron API not available"
This error means the component is trying to use `InventorySqliteRepository` outside of Electron context.

**Solution:** The repository selector should handle this automatically. If not:
```typescript
// In a component
import { isDesktop } from '@/db/repositories/base';

// Only renders this on desktop
{isDesktop() && <DesktopFeature />}
```

### Type Errors
If TypeScript complains about `IInventoryRepository`:
```typescript
// Make sure to import the interface
import { getInventoryRepository, IInventoryRepository } from '@/db/repositories';

const repo: IInventoryRepository = getInventoryRepository();
```

### Performance Issues
If queries are slow on desktop:
- Check that SQLite indexes are created (see `desktop/db/schema.sql`)
- Verify no blocking UI operations
- Use `getByIdWithItems()` instead of separate queries

---

## Next Steps

1. **Immediate** (Phase 1.2): Update barcode scanner component
2. **Short-term** (Phase 1.3): Create "Sync Now" UI button
3. **Medium-term** (Phase 2): Implement actual Supabase sync API
4. **Long-term** (Phase 3): Add conflict resolution for dual editing
