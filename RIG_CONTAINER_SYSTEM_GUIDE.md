# Rig Container System - Complete Guide

## Overview
The rig container system allows you to create equipment groupings that act as "slave containers" where items inherit the container's location and can be scanned together as a unit.

## Features Implemented

### 1. Container Barcode Generation ✅
- **Auto-generated barcodes**: Format `RIG-{8 characters}`
- Example: `RIG-A1B2C3D4`
- Barcodes are automatically generated when creating a new container
- Print barcode labels directly from the container detail page

### 2. Location Tracking ✅
- **Default Location**: The home/storage location of the container
- **Current Location**: Where the container currently is (e.g., "Out for Event")
- Items in the container inherit the container's location

### 3. Container Management ✅
- Create containers with name, description, category, and default location
- Add/remove items to/from containers
- Edit container details including locations
- Delete containers (also removes all items from the container)

## Database Migration Required

**IMPORTANT**: You need to run this SQL migration in your Supabase SQL Editor before the location features will work:

```sql
-- Add location and barcode to rig_containers table
ALTER TABLE rig_containers 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS current_location TEXT;

-- Update existing rig_containers to generate barcodes if they don't have one
-- Barcode format: RIG-{last 8 chars of ID}
UPDATE rig_containers
SET barcode = 'RIG-' || UPPER(SUBSTRING(id::text, 25, 8))
WHERE barcode IS NULL;

-- Create function to auto-generate barcode on insert
CREATE OR REPLACE FUNCTION generate_rig_container_barcode()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.barcode IS NULL THEN
    NEW.barcode := 'RIG-' || UPPER(SUBSTRING(NEW.id::text, 25, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate barcode
DROP TRIGGER IF EXISTS trigger_generate_rig_barcode ON rig_containers;
CREATE TRIGGER trigger_generate_rig_barcode
  BEFORE INSERT ON rig_containers
  FOR EACH ROW
  EXECUTE FUNCTION generate_rig_container_barcode();

-- Add comments
COMMENT ON COLUMN rig_containers.location IS 'Default/home location for the container';
COMMENT ON COLUMN rig_containers.current_location IS 'Current physical location of the container';
```

## How to Use

### Creating a Container

1. Go to **Inventory → Rig Containers**
2. Click **"New Rig"** button
3. Fill in:
   - **Rig Name** (required): e.g., "Standard PA System"
   - **Description**: Brief description of the setup
   - **Category**: Select from predefined categories
   - **Default Location**: Where this container is normally stored
4. Click **"Create Rig"**
5. A barcode is automatically generated

### Adding Items to Container

1. Open a container by clicking on it
2. Click **"Add Item"** (green button with + icon)
3. Search for items by name or barcode
4. Select an item from the search results
5. Enter quantity and optional notes
6. Click **"Add to Rig"**

### Editing Container Details

1. Open a container
2. Click **"Edit Details"**
3. Update:
   - Name
   - Description
   - Default Location
   - Current Location (where it is right now)
4. Click **"Save"**

### Viewing Container Items

The container detail page shows:
- Container barcode (auto-generated, printable)
- Location information
- Complete list of items in the container
- Quantity of each item
- Notes for each item

### Removing Items from Container

1. Open a container
2. Find the item in the list
3. Click the trash icon next to the item
4. Confirm removal

## Slave Item Behavior (Future Implementation)

The following behaviors are planned for the next phase:

### When Items Are In Container:
1. **Location Inheritance**: Item location automatically matches container location
2. **Container Scan = Bulk Scan**: Scanning container barcode scans all items at once
3. **Single Item Scan**: Scanning an individual item prompts to scan whole container
4. **Movement Tracking**: Moving container updates all item locations

### When Items Are Removed:
- Item location behavior returns to normal
- Item can be tracked independently
- Individual scanning resumes

## Container Scanning Workflow (To Be Implemented)

### Scenario 1: Scan Container Barcode
```
User scans: RIG-A1B2C3D4
System:
  ✓ Identifies container
  ✓ Scans all 15 items in container
  ✓ Updates location for all items
  ✓ Records single scan event
Result: All items marked as scanned/checked out
```

### Scenario 2: Scan Single Item in Container
```
User scans: Speaker barcode (item in container)
System:
  ! Detects item belongs to container RIG-A1B2C3D4
  ? Prompt: "This item is in container RIG-A1B2C3D4. Scan entire container?"
  ✓ User confirms → Scans all items in container
  ✗ User declines → Removes item from container, scans individually
```

### Scenario 3: Check In Container
```
User scans: RIG-A1B2C3D4 (returning from event)
System:
  ✓ Checks in all items in container
  ✓ Updates current_location to default_location
  ✓ Marks all items as available
```

## Location Tracking

### Default Location
- Where the container is normally stored
- Used for inventory management
- Example: "Warehouse Bay 3", "Storage Room A"

### Current Location
- Where the container is right now
- Updates when container is checked out/in
- Example: "Out for Wedding - Venue ABC", "In Transit"

## Barcode Format

**Container Barcodes**: `RIG-{8 characters}`
- Format: CODE128
- Auto-generated from container ID
- Unique identifier
- Printable via built-in label generator

## API Endpoints

The following functions are available in `lib/hooks/useRigContainers.ts`:

```typescript
// Container Management
createRigContainer(input: { name, description?, category?, location? })
updateRigContainer(id, input: { name?, description?, category?, location?, current_location? })
deleteRigContainer(id)

// Item Management
addItemToRig(input: { rig_container_id, inventory_item_id, quantity, notes? })
updateRigItem(id, input: { quantity?, notes? })
removeItemFromRig(id)

// Data Fetching
useRigContainers() // Get all containers
useRigContainer(id) // Get single container with items
```

## Database Schema

### rig_containers Table
```sql
CREATE TABLE rig_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  barcode TEXT UNIQUE,
  location TEXT,              -- Default/home location
  current_location TEXT,      -- Current physical location
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### rig_container_items Table
```sql
CREATE TABLE rig_container_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rig_container_id UUID REFERENCES rig_containers(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Next Steps for Full Implementation

1. **Run SQL Migration** (see above)
2. **Implement Container Scanning Logic**:
   - Modify barcode scanner to detect container barcodes
   - Add bulk scan functionality
   - Implement item-to-container detection
3. **Add Location Inheritance**:
   - Update item location when container location changes
   - Create trigger or function to sync locations
4. **Implement Check-In/Out Workflows**:
   - Bulk check-out for containers
   - Bulk check-in with location reset
5. **Add Container Status Tracking**:
   - Available, In Use, In Transit, Maintenance

## Benefits

✅ **Fast Deployment**: Scan one barcode to check out entire setup
✅ **Accurate Tracking**: All items move together, no missed gear
✅ **Easy Returns**: Scan container to check everything back in
✅ **Location Awareness**: Always know where your containers are
✅ **Preset Configurations**: Standard setups ready to go
✅ **Reduced Errors**: Less manual scanning = fewer mistakes

## Use Cases

1. **PA System Packages**: Complete sound systems in one container
2. **Lighting Rigs**: Pre-configured lighting setups
3. **DJ Packages**: All DJ equipment grouped together
4. **Band Backline**: Instruments and amps as a unit
5. **Cable Packs**: Organized cable collections
6. **Staging Kits**: Staging components together

## Files Modified

- `sql/add_rig_container_location_barcode.sql` - SQL migration
- `lib/hooks/useRigContainers.ts` - Added location fields to types and functions
- `app/app/inventory/rigs/page.tsx` - Added location field to create form
- `app/app/inventory/rigs/[id]/page.tsx` - Added location display and edit fields

## Support

For issues or questions about the container system, check:
1. Make sure SQL migration has been run
2. Verify barcode generation is working
3. Check Supabase logs for errors
4. Review console logs during scanning operations
