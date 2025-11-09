# Dashboard Widgets Implementation - Setup Instructions

## Overview
All three dashboard widgets (My Schedule, Tasks, Open Invoices) have been implemented with full functionality. They now pull real data from the database instead of showing hardcoded values.

## Required Database Migrations

You need to run these SQL migration files in your Supabase SQL Editor in this order:

### 1. Add Job Date Fields
**File:** `sql/migrations/2025-11-09_add_job_dates.sql`
- Adds `event_date`, `load_in_date`, `load_out_date`, `prep_start_date` to jobs table
- Required for the My Schedule widget to show job-related events

### 2. Create Tasks Table
**File:** `sql/migrations/2025-11-09_create_tasks.sql`
- Creates tasks table for user task management
- Includes RLS policies so users only see their own tasks
- Required for the Tasks widget functionality

### 3. Create Invoices Table
**File:** `sql/migrations/2025-11-09_create_invoices.sql`
- Creates invoices table for revenue/payment tracking
- Links to jobs table via job_id foreign key
- Required for the Open Invoices widget revenue calculations

## Widget Features

### My Schedule Widget
**Status:** ✅ Fully Functional

**Features:**
- Shows real events from jobs and transports tables
- Displays prep, load-in, event, load-out, and transport events
- Filter by "Today" or "Tomorrow"
- Shows location, date, and time for each event
- Automatically sorts events by time
- Shows loading state and empty state messages

**Data Sources:**
- Jobs table: `prep_start_date`, `load_in_date`, `event_date`, `load_out_date`
- Transports table: `depart_at`, `arrive_at`

### Tasks Widget
**Status:** ✅ Fully Functional

**Features:**
- Add new tasks with + button
- Mark tasks as complete/incomplete
- Delete tasks (hover to see delete button)
- Shows due date status (overdue, due soon, etc.)
- Shows loading state and empty state
- Automatically calculates if tasks are overdue

**Operations:**
- CREATE: Click + button, enter title, press Enter or click Add Task
- READ: Auto-loads all tasks for current user
- UPDATE: Click checkbox to toggle complete/pending status
- DELETE: Hover over task, click trash icon

**Security:**
- RLS policies ensure users only see their own tasks

### Open Invoices Widget
**Status:** ✅ Fully Functional

**Features:**
- Shows outstanding invoice amount in USD (changed from EUR)
- Categorizes revenue into:
  - **Outstanding**: Invoices sent but not paid
  - **Overdue**: Invoices past their due date
  - **Yet to be invoiced**: Jobs with income but no invoice generated
- Real-time calculation from jobs and invoices tables
- Visual progress bar showing breakdown by category
- Shows loading state and empty state

**Calculations:**
- Queries all jobs with `income > 0`
- Queries all invoices with status 'sent' or 'draft'
- Matches jobs to invoices via `job_id`
- Identifies overdue invoices by comparing `due_date` to current date
- Finds "yet to invoice" jobs that have income but no invoice record

## Previously Pending Migrations

You also have these migrations that may need to be run:

1. **2025-11-09_add_gear_type_to_inventory.sql**
   - Adds `gear_type` field to inventory_items table
   - Required for pull sheets gear type dropdown

2. **populate_gear_types.sql**
   - Populates gear types with standard values
   - Should be run after the above migration

3. **2025-11-09_add_company_to_user_profiles.sql**
   - Adds `company_name` field to user_profiles table
   - Required for profile menu company name feature

## How to Run Migrations

1. Open your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the content of each migration file
4. Paste into the SQL Editor
5. Click "Run" or press Ctrl+Enter
6. Check for success messages
7. Repeat for each migration file

## Testing After Migration

After running the migrations:

1. **My Schedule:**
   - Add some jobs with event dates, load-in dates, etc.
   - Click between "Today" and "Tomorrow" to see different events
   - Verify events show correct time, location, and title

2. **Tasks:**
   - Click the + button to add a task
   - Check/uncheck tasks to mark complete
   - Hover over tasks to delete them
   - Verify only your tasks appear (RLS working)

3. **Open Invoices:**
   - Add jobs with `income` values
   - Create invoices for some jobs (optional)
   - Set `due_date` on invoices to test overdue detection
   - Verify USD currency format ($X,XXX.XX)
   - Check that totals calculate correctly

## Database Schema Updates

The TypeScript types in `types/database.ts` have been updated to include:

- New job fields: `income`, `labor_cost`, `profit`, `event_date`, `load_in_date`, `load_out_date`, `prep_start_date`
- Tasks table: Full definition with all fields
- Invoices table: Full definition with all fields and foreign key relationship to jobs

## Files Modified

1. `components/MySchedule.tsx` - Real-time schedule from jobs/transports
2. `components/Tasks.tsx` - Full CRUD task management
3. `components/OpenInvoices.tsx` - Real-time revenue calculations in USD
4. `types/database.ts` - Added types for new tables and fields
5. `sql/migrations/2025-11-09_create_tasks.sql` - Tasks table schema
6. `sql/migrations/2025-11-09_create_invoices.sql` - Invoices table schema
7. `sql/migrations/2025-11-09_add_job_dates.sql` - Job date fields

## Future Enhancements (Optional)

- Add "Generate Invoice" button on job detail pages
- Add "Mark Paid" button for invoices
- Add task due date picker when creating tasks
- Add task assignees selection
- Add more schedule views (week, month)
- Add filtering/sorting options for tasks
