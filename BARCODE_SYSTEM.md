# Barcode Generation System

## Overview
This system generates unique barcodes for inventory items using a **prefix-serial** format that allows tracking of individual physical units while grouping them by item type.

## Barcode Format

```
PREFIX-XXX
```

- **PREFIX**: 3-6 character identifier for the item type (e.g., `X32`, `SM58`, `LEDPAR`)
- **XXX**: 3-digit serial number starting from `001` (e.g., `001`, `002`, `023`)

### Examples
- `X32-001` - First X32 mixer
- `X32-002` - Second X32 mixer (different physical unit)
- `SM58-001` - First Shure SM58 microphone
- `LEDPAR-012` - Twelfth LED PAR can

## How It Works

### 1. Prefix Generation
The prefix is automatically generated from the item name:
- Removes common words like "Mixer", "Microphone", "Speaker", etc.
- Takes the first word or first 6 characters
- Converts to uppercase
- Removes special characters

**Examples:**
```typescript
generatePrefix("X32 Mixer")      // "X32"
generatePrefix("Shure SM58")     // "SM58"
generatePrefix("LED PAR Can")    // "LEDPAR"
generatePrefix("Sennheiser e935") // "SENNHE"
```

### 2. Serial Number Assignment
- Queries database for existing items with the same prefix
- Finds the highest serial number used
- Assigns the next sequential number (e.g., if X32-002 exists, next is X32-003)
- Pads to 3 digits with leading zeros

### 3. Duplicate Scan Prevention
When scanning equipment for jobs:

#### Scanning OUT (taking equipment)
- ✅ **Allowed**: Scanning `X32-001` for the first time on a job
- ✅ **Allowed**: Scanning `X32-002` even if `X32-001` was already scanned (different physical unit)
- ❌ **Blocked**: Scanning `X32-001` again on the same job (duplicate)
- 💡 **Solution**: Either scan a different unit (`X32-002`) or scan `X32-001` back IN first

#### Scanning IN (returning equipment)
- ✅ **Allowed**: Scanning `X32-001` IN after it was scanned OUT
- ❌ **Blocked**: Scanning `X32-001` IN if it was never scanned OUT
- ❌ **Blocked**: Scanning `X32-001` IN if it was already scanned IN

## Usage

### In the UI (Inventory Forms)

1. Navigate to **Add Inventory** or **Edit Inventory**
2. Enter the item name (e.g., "X32 Mixer")
3. Click the **Generate** button next to the barcode field
4. A unique barcode is automatically created (e.g., `X32-001`)

The Generate button is disabled until you enter an item name.

### Programmatically

```typescript
import { generateBarcode, getBarcodePrefix, getBarcodeSerial, isSameItemType } from '@/lib/utils/barcodeGenerator';

// Generate a new barcode
const barcode = await generateBarcode("X32 Mixer");
// Returns: "X32-001" (or next available number)

// Extract parts
const prefix = getBarcodePrefix("X32-001"); // "X32"
const serial = getBarcodeSerial("X32-001"); // "001"

// Compare item types
const same = isSameItemType("X32-001", "X32-002"); // true (both X32s)
const different = isSameItemType("X32-001", "SM58-001"); // false
```

### Checking for Duplicate Scans

```typescript
import { isBarcodeAlreadyScanned } from '@/lib/utils/barcodeGenerator';

const isDupe = await isBarcodeAlreadyScanned("X32-001", jobId);
if (isDupe) {
  console.log("This barcode was already scanned for this job!");
}
```

## Database Setup

Run this migration to enable duplicate scan prevention:

```bash
# Apply the migration
psql -U postgres -d your_database -f sql/migrations/2025-11-09_add_barcode_duplicate_prevention.sql
```

This updates the `scan_direction()` function to:
- Check for duplicate scans before allowing OUT scans
- Validate IN scans require a previous OUT scan
- Log all scan attempts to `scan_events` table for audit trail
- Return helpful error messages explaining why a scan was blocked

## API Response

When a duplicate scan is detected, the API returns:

```json
{
  "error": "Duplicate scan: Barcode X32-001 was already scanned OUT for job JOB-123. Use a different unit or scan it IN first.",
  "duplicate": true
}
```

HTTP Status: `409 Conflict` (for duplicates) or `400 Bad Request` (for other errors)

## Benefits

1. **Inventory Tracking**: Know exactly which physical unit is on which job
2. **Prevent Errors**: Can't accidentally scan the same mixer twice
3. **Easy Identification**: Techs can quickly see item type from barcode prefix
4. **Scalable**: Supports up to 999 units per item type (can extend if needed)
5. **Flexible**: Can manually override barcodes if needed

## Edge Cases

### What if I have more than 999 units?
The system will generate `001` through `999`. After that, you can manually create `1000`, `1001`, etc., or modify the padding in `barcodeGenerator.ts`.

### What if I want custom prefixes?
You can manually enter any barcode format. The generator is just a convenience tool.

### What if the item name changes?
Existing barcodes remain unchanged. Only new items use the updated name for prefix generation.

### What about "free scan" mode?
The current implementation enforces IN/OUT tracking. To add a "free scan" mode that bypasses duplicate checking, you would:
1. Add a `scan_mode` parameter to the API
2. Update `scan_direction()` function to skip duplicate check when `scan_mode = 'FREE'`
3. Add a toggle in your scan UI

## Files

- **Utility**: `lib/utils/barcodeGenerator.ts` - Core barcode generation functions
- **Migration**: `sql/migrations/2025-11-09_add_barcode_duplicate_prevention.sql` - Database function
- **API**: `app/api/scan-direction/route.ts` - Scan endpoint with duplicate detection
- **UI**: `app/app/inventory/new/page.tsx` - Create form with generator button
- **UI**: `app/app/inventory/[id]/page.tsx` - Edit form with generator button
