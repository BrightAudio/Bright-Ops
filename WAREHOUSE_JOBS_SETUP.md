# Warehouse Location Tracking for Jobs

## Overview
Jobs are now automatically tagged with the warehouse location where they were created, matching the inventory location system.

## How It Works

### 1. Database Schema
Jobs now have a `warehouse` column that stores the warehouse location:
- **Default:** 'NEW SOUND Warehouse'
- **Options:** 
  - 'NEW SOUND Warehouse'
  - 'Bright Audio Warehouse'

### 2. Location Detection
When creating a job, the system automatically:
1. Reads the current active warehouse location from the Location Context
2. Attaches that warehouse to the job
3. If "All Locations" is selected, defaults to "NEW SOUND Warehouse"

### 3. User Interface

#### Warehouse Jobs Page (`/app/warehouse/jobs`)
- **Header:** Shows current active location with 📍 icon
- **Create Form:** Displays which warehouse the job will be created for
- **Table:** Shows warehouse column with color-coded badge
- Jobs are visible regardless of current location filter

#### Main Jobs Page (`/app/jobs`)
- Automatically attaches current warehouse location to new jobs
- Works seamlessly with existing client/venue flow

### 4. Location Management
Users can change their active warehouse location at `/app/inventory/locations`:
- Select between warehouses
- Selection persists across sessions (localStorage)
- Affects both inventory filtering AND job creation

## Required Migration

Run this SQL in Supabase SQL Editor:

```sql
-- File: sql/migrations/2025-12-02_add_warehouse_to_jobs.sql
-- Add warehouse/location column to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS warehouse TEXT DEFAULT 'NEW SOUND Warehouse';

COMMENT ON COLUMN jobs.warehouse IS 'Warehouse location where job was created/managed';

CREATE INDEX IF NOT EXISTS idx_jobs_warehouse ON jobs(warehouse);

UPDATE jobs SET warehouse = 'NEW SOUND Warehouse' WHERE warehouse IS NULL;
```

## Benefits

1. **Inventory Alignment:** Jobs match the warehouse system used by inventory
2. **Multi-Location Support:** Track which warehouse manages each job
3. **Automatic Tracking:** No manual selection needed - uses active location
4. **Reporting Ready:** Can filter/report jobs by warehouse
5. **Pull Sheet Context:** Pull sheets can show warehouse context

## Future Enhancements

Potential features to add:
- Filter jobs by warehouse location
- Warehouse-specific reporting dashboards
- Cross-warehouse job transfers
- Warehouse capacity planning
- Equipment availability by warehouse

## Code Changes

### Files Modified:
1. `sql/migrations/2025-12-02_add_warehouse_to_jobs.sql` - Database migration
2. `app/app/warehouse/jobs/page.tsx` - Warehouse jobs page with location display
3. `app/app/jobs/page.tsx` - Main jobs page with location tracking

### Key Implementation:
```tsx
import { useLocation } from "@/lib/contexts/LocationContext";

const { currentLocation } = useLocation();

// When creating job:
const jobData = {
  ...form,
  warehouse: currentLocation === 'All Locations' 
    ? 'NEW SOUND Warehouse' 
    : currentLocation
};
```

## Testing Checklist

- [ ] Run database migration in Supabase
- [ ] Create job from NEW SOUND Warehouse location - verify warehouse field
- [ ] Create job from Bright Audio Warehouse location - verify warehouse field  
- [ ] Create job with "All Locations" selected - should default to NEW SOUND
- [ ] Verify warehouse column displays correctly in jobs table
- [ ] Check existing jobs have default warehouse set
- [ ] Verify pull sheets still work correctly with warehouse-tagged jobs

## Integration with Existing Features

### Pull Sheets
- Pull sheets linked to jobs will inherit job's warehouse context
- Can be used for warehouse-specific equipment allocation

### Inventory
- Jobs and inventory share same warehouse location system
- Enables warehouse-specific availability checks

### Reporting
- Jobs can be filtered by warehouse in future reports
- Revenue/labor can be segmented by warehouse location
