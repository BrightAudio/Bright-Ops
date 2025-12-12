# Warehouse PIN-Based Access Control System

## Overview
Implemented a comprehensive multi-tenant warehouse access control system where users must have the correct warehouse name + PIN combination to access inventory at that location.

## Database Changes

### SQL Migration File
**Location**: `sql/migrations/2025-12-12_warehouse_access_control.sql`

This migration adds:
1. **PIN column** to `warehouses` table for access authentication
2. **user_warehouse_access junction table** to track which users can access which warehouses
3. **Updated RLS policies** for warehouse access based on user-warehouse relationships
4. **Data migration** that:
   - Adds PIN `6588` to "NEW SOUND Warehouse"
   - Grants access to all current users
   - Creates "Bright Audio Warehouse" (without PIN initially)

### Schema Changes

#### warehouses table
```sql
ALTER TABLE public.warehouses 
ADD COLUMN pin TEXT;
```

#### user_warehouse_access table (NEW)
```sql
CREATE TABLE public.user_warehouse_access (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  warehouse_id UUID REFERENCES warehouses(id),
  granted_at TIMESTAMPTZ,
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, warehouse_id)
);
```

## Application Features

### 1. Stock Locations Page (`app/app/inventory/locations/page.tsx`)
**Enhanced features:**
- Dynamically loads warehouses user has access to
- Shows "All Locations" + accessible warehouses only
- **Join Warehouse** button opens modal
- **Join Modal** allows entering warehouse name + PIN
- Validates credentials before granting access
- **Remove Access** button per warehouse
- Shows warehouse PIN for reference
- Set active location for inventory filtering

### 2. Account Settings (`app/app/settings/account/page.tsx`)
**New "Warehouse Access" section:**
- Lists all warehouses user has access to
- Shows warehouse name, address, and PIN
- Copy PIN to clipboard functionality
- Link to "Join Warehouse" page
- Information box explaining how to share access

### 3. Location Context (`lib/contexts/LocationContext.tsx`)
**Dynamic location loading:**
- Queries `user_warehouse_access` table on mount
- Loads warehouse names user has access to
- `refreshLocations()` function to reload after join/remove
- Backwards compatible with existing code
- Persists selected location to localStorage

## Security Model

### Access Control Flow
1. User enters warehouse name + PIN in the join modal
2. **Secure Function** `join_warehouse_with_pin()` verifies credentials (bypasses RLS for lookup)
3. If valid, function creates entry in `user_warehouse_access`
4. User can now see that warehouse and its inventory
5. User can remove their own access (requires PIN to rejoin)

### Key Security Features

**Warehouses persist independently of user access:**
- Warehouses exist in database even if no users have access
- Inventory items remain tied to their warehouse location
- If you lose access, you can't see the inventory, but it persists for others
- Serial numbers and items stay attached to their warehouse

**RLS Policies enforce access:**

```sql
-- Users can ONLY view warehouses they have explicit access to
CREATE POLICY "Users can view accessible warehouses"
  ON warehouses FOR SELECT
  USING (
    id IN (
      SELECT warehouse_id 
      FROM user_warehouse_access 
      WHERE user_id = auth.uid()
    )
  );

-- Users can ONLY see inventory from warehouses they have access to
CREATE POLICY "Users can view inventory from accessible warehouses"
  ON inventory_items FOR SELECT
  USING (
    location IN (
      SELECT w.name
      FROM warehouses w
      JOIN user_warehouse_access uwa ON uwa.warehouse_id = w.id
      WHERE uwa.user_id = auth.uid()
    )
  );
```

**Secure join function:**
- Uses `SECURITY DEFINER` to bypass RLS temporarily
- Only for PIN verification during join process
- Cannot be exploited to see other warehouses
- Validates credentials before granting access

## Setup Instructions

### Step 1: Run SQL Migration
Open Supabase SQL Editor and run:
```bash
sql/migrations/2025-12-12_warehouse_access_control.sql
```

This will:
- Add PIN column to warehouses
- Create user_warehouse_access table
- Set up RLS policies
- Add PIN 6588 to NEW SOUND Warehouse
- Grant access to all existing users

### Step 2: Regenerate TypeScript Types
```bash
npx supabase gen types typescript --project-id qifhpsazsnmqnbnazrct > types/database.ts
```

### Step 3: Test the Flow
1. Navigate to `/app/inventory/locations`
2. Should see "NEW SOUND Warehouse" (existing users)
3. Click "Join Warehouse"
4. Try joining with name + PIN
5. Verify access in Account Settings
6. Test removing access

## Usage Examples

### For Administrators
1. Create new warehouse in Supabase with a PIN
2. Share warehouse name + PIN with team members
3. Users join via Stock Locations page
4. Admins can view PINs in Account Settings to share

### For Team Members
1. Get warehouse name + PIN from admin
2. Go to Stock Locations (`/app/inventory/locations`)
3. Click "Join Warehouse"
4. Enter credentials
5. Access granted - can now see inventory from that location

### Sharing Access
- Organization admin: "Our warehouse is 'NEW SOUND Warehouse' with PIN 6588"
- Team member joins using those credentials
- System verifies and grants access
- Team member can now filter inventory to that location

## Migration Path for Existing Users

All current users automatically get access to "NEW SOUND Warehouse" (PIN 6588) when the migration runs. This ensures:
- No disruption to existing workflows
- Backwards compatibility
- Smooth transition to PIN-based system

## Future Enhancements

1. **PIN Management**: Allow managers to change warehouse PINs
2. **Access Audit Log**: Track who granted access to whom
3. **Time-Limited Access**: Expire access after certain period
4. **Role-Based PINs**: Different PINs for managers vs associates
5. **Bulk Access Grants**: Admin interface to grant access to multiple users
6. **Access Requests**: Users can request access, pending approval

## Security Considerations

### PIN Security
- PINs should be 4+ characters (enforced in UI)
- PINs are stored in plain text (consider hashing for production)
- Name matching is case-insensitive (LOWER comparison)
- PIN matching is case-sensitive (exact match)

### Access Control
- Users can only grant access to themselves
- Users can only remove their own access
- **Users CANNOT see warehouses they don't have access to**
- **Users CANNOT see inventory from warehouses they don't have access to**

### Data Persistence
- **Warehouses persist even if no users have access**
- **Inventory items persist even if you lose warehouse access**
- Serial numbers remain attached to their warehouse location
- If you rejoin with the PIN, you'll see all the same inventory

### Database-Level Security
- RLS policies on `warehouses` table prevent unauthorized viewing
- RLS policies on `inventory_items` table filter by warehouse access
- Secure function `join_warehouse_with_pin()` uses elevated privileges only for PIN verification
- All other operations respect user permissions

## Files Modified

1. `sql/migrations/2025-12-12_warehouse_access_control.sql` - Database schema
2. `app/app/inventory/locations/page.tsx` - Join warehouse UI
3. `app/app/settings/account/page.tsx` - Warehouse access display
4. `lib/contexts/LocationContext.tsx` - Dynamic location loading
5. `types/database.ts` - TypeScript types (needs regeneration)

## Testing Checklist

- [ ] Run SQL migration in Supabase
- [ ] Regenerate TypeScript types
- [ ] Verify NEW SOUND Warehouse has PIN 6588
- [ ] Existing users can see NEW SOUND Warehouse
- [ ] Join new warehouse with correct PIN works
- [ ] Join with incorrect PIN fails gracefully
- [ ] Remove warehouse access works
- [ ] Removed warehouse disappears from list
- [ ] Account Settings shows warehouse PINs
- [ ] Location context refreshes after join/remove
- [ ] Inventory filtering respects warehouse access
- [ ] Unauthorized users cannot see restricted warehouses

## Notes

- The migration script is idempotent (safe to run multiple times)
- PIN 6588 is specifically assigned to NEW SOUND Warehouse
- All current users get automatic access to maintain continuity
- Future users will need PINs to join any warehouse
- System supports unlimited warehouses per organization
- Each warehouse can have its own unique PIN
