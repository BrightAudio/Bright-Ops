# Fleet Management & Notifications Setup Guide

## Overview
This document describes the fleet management system for transports and the database-backed notifications system for employee job assignments.

## Features Implemented

### 1. Fleet Management System
- **New Page**: `/app/warehouse/fleet` - Manage company vehicles
- **Database Table**: `fleet` - Stores vehicle information
- **Integration**: Transports now pull from fleet vehicles

### 2. Transport Page Improvements  
- **Back Button**: Navigate to previous page or warehouse
- **Manage Fleet Button**: Quick access to fleet management
- **Vehicle Selection**: Shows fleet vehicles first, then previously used vehicles

### 3. Database-Backed Notifications
- **Notifications Table**: Stores persistent notifications
- **Employee Integration**: Notifications tied to employee records
- **Real-time Updates**: Supabase real-time subscriptions
- **Fallback**: Works with localStorage if employee ID not available

## Database Migrations to Run

### Migration 1: Fleet Table
**File**: `sql/migrations/2025-12-02_create_fleet.sql`

Creates the `fleet` table with:
- `id` (UUID, Primary Key)
- `name` (TEXT, Required) - Vehicle name
- `type` (TEXT) - e.g., "Box Truck", "Van", "Trailer"
- `license_plate` (TEXT) - License plate number
- `status` (TEXT) - "Active", "Maintenance", or "Retired"
- `notes` (TEXT) - Optional notes
- `created_at` / `updated_at` (Timestamps)

**Sample Data**: Includes 3 sample vehicles

### Migration 2: Notifications Table
**File**: `sql/migrations/2025-12-02_create_notifications.sql`

Creates the `notifications` table with:
- `id` (UUID, Primary Key)
- `user_id` (UUID) - References `employees.id`
- `type` (TEXT) - "job_assignment", "pull_sheet", "job_update", "system"
- `title` (TEXT, Required)
- `message` (TEXT, Required)
- `link` (TEXT) - Optional URL to related resource
- `read` (BOOLEAN) - Read status
- `created_at` / `updated_at` (Timestamps)

**Features**:
- RLS policies for user-specific access
- Indexes for efficient queries
- Auto-updating timestamps

## How to Run Migrations

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run migrations in this order:
   ```sql
   -- 1. Create Fleet Table
   -- Copy contents of sql/migrations/2025-12-02_create_fleet.sql
   
   -- 2. Create Notifications Table  
   -- Copy contents of sql/migrations/2025-12-02_create_notifications.sql
   ```

4. **Regenerate TypeScript Types**:
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
   ```
   Replace `YOUR_PROJECT_ID` with your actual Supabase project ID.

## Testing Checklist

### Fleet Management
- [ ] Navigate to `/app/warehouse/fleet`
- [ ] Add a new vehicle
- [ ] Edit a vehicle
- [ ] Change vehicle status to "Maintenance"
- [ ] Delete a vehicle
- [ ] Go to `/app/warehouse/transports`
- [ ] Verify fleet vehicles appear in dropdown
- [ ] Create a transport using a fleet vehicle

### Notifications
- [ ] Ensure employee record exists with email matching your auth user
- [ ] Create a job
- [ ] Assign yourself (or another employee) to the job
- [ ] Check bell icon in top-right - should show notification
- [ ] Click notification - should navigate to job
- [ ] Mark notification as read
- [ ] Verify it disappears from unread list

### Employee-Notification Connection
- [ ] Log in with user email
- [ ] Verify employee record exists in `employees` table with matching email
- [ ] Check browser console for employeeId being set
- [ ] Confirm notifications are loading from database (not localStorage)

## Code Changes

### New Files
1. **`sql/migrations/2025-12-02_create_fleet.sql`** - Fleet table migration
2. **`app/app/warehouse/fleet/page.tsx`** - Fleet management page

### Modified Files

**`app/app/warehouse/transports/page.tsx`**:
- Added back button with router navigation
- Added "Manage Fleet" button
- Added fleet vehicle loading (`loadFleet()`)
- Updated vehicle dropdowns to show fleet vehicles first
- Grouped vehicle options (Fleet vs Previously Used)

**`components/layout/DashboardLayout.tsx`**:
- Added employee record lookup by email in `fetchUserProfile()`
- Set `currentEmployeeId` state when employee found
- Pass `currentEmployeeId` to `useNotifications(currentEmployeeId)`
- Fixed notification type icons

**`lib/hooks/useNotifications.ts`**:
- Made `employeeId` parameter optional
- Falls back to localStorage if no employeeId provided
- Database queries only run when employeeId exists
- Real-time subscriptions for new notifications

## Fleet Management Usage

### Adding a Vehicle
1. Navigate to `/app/warehouse/fleet`
2. Click "Add Vehicle"
3. Fill in:
   - **Name** (required): e.g., "Box Truck #1"
   - **Type**: Select from dropdown
   - **License Plate**: Optional
   - **Status**: Active, Maintenance, or Retired
   - **Notes**: Optional details
4. Click "Create"

### Using Fleet Vehicles in Transports
1. Go to `/app/warehouse/transports`
2. Create new transport
3. In "Vehicle" dropdown:
   - Fleet vehicles appear first (grouped)
   - Previously used vehicles appear second
   - Can still add custom vehicle with "+ Add New Vehicle"

## Notifications System

### How It Works
1. When employee assigned to job:
   - System creates notification in database
   - Real-time subscription pushes to user's bell icon
   - Notification includes job link and details

2. Notification appears:
   - Bell icon shows unread count (red dot)
   - Click bell to see notification dropdown
   - Click notification to navigate to job
   - Mark as read to dismiss

3. Fallback behavior:
   - If no employee ID found, uses localStorage
   - Allows system to work before employee connection set up

### Employee Setup Required
For notifications to work properly, ensure:
1. Employee record exists in `employees` table
2. Employee email matches auth user email
3. Employee is assigned to jobs they should be notified about

## Troubleshooting

### Fleet vehicles not showing in transports
- Verify fleet migration ran successfully
- Check vehicles have `status = 'Active'`
- Refresh page to reload fleet data

### Notifications not appearing
- Check employee email matches auth user email
- Verify notifications migration ran
- Check browser console for employeeId
- Verify RLS policies allow user access

### TypeScript errors about 'fleet' or 'notifications'
- Run database migrations first
- Regenerate TypeScript types from Supabase
- Restart VS Code or dev server

## Future Enhancements

### Fleet Management
- Vehicle maintenance tracking
- Fuel logging
- Mileage tracking
- Vehicle availability calendar
- Automatic assignment suggestions

### Notifications
- Email notifications for assignments
- SMS notifications for urgent updates
- Push notifications (browser)
- Notification preferences per user
- Notification history page
- Bulk actions (mark all as read)

## API Reference

### Fleet Table Schema
```typescript
interface FleetVehicle {
  id: string;
  name: string;
  type: string | null;
  license_plate: string | null;
  status: 'Active' | 'Maintenance' | 'Retired';
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

### Notifications Table Schema
```typescript
interface Notification {
  id: string;
  user_id: string; // References employees.id
  type: 'job_assignment' | 'pull_sheet' | 'job_update' | 'system';
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
  updated_at: string;
}
```

## Support
If you encounter issues:
1. Check this guide's troubleshooting section
2. Verify all migrations ran successfully
3. Check browser console for errors
4. Ensure employee records exist with matching emails
