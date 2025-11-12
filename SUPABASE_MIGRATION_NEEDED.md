# Supabase Migration Required

## Overview
The enhanced jobs UI requires additional database columns that may not exist in your Supabase database yet.

## Migration File
Run this migration in your Supabase SQL Editor:
**File:** `sql/migrations/2025-11-12_add_job_fields_for_ui.sql`

## What It Adds

### Jobs Table
- `start_at` (TIMESTAMPTZ) - Job/event start date and time
- `end_at` (TIMESTAMPTZ) - Job/event end date and time  
- `venue` (TEXT) - Event venue location
- `notes` (TEXT) - General notes about the job
- `income` (DECIMAL) - Total income/revenue for the job
- `labor_cost` (DECIMAL) - Total labor cost
- `profit` (DECIMAL, COMPUTED) - Automatically calculated as (income - labor_cost)
- `client_id` (UUID, FK) - Reference to clients table

### Clients Table
- `email` (TEXT) - Client email address
- `phone` (TEXT) - Client phone number

### Indexes Added
- `idx_jobs_start_at` - For date filtering (this week, upcoming jobs)
- `idx_jobs_end_at` - For date range queries
- `idx_jobs_status` - For status filtering
- `idx_jobs_client_id` - For client lookups

## How to Run

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `sql/migrations/2025-11-12_add_job_fields_for_ui.sql`
4. Click "Run" or press Ctrl+Enter
5. Verify no errors appear

## Features That Require This Migration

- ✅ Summary stats (Jobs this week, Upcoming jobs, Total revenue)
- ✅ Financial tracking (Income, Labor Cost, Profit calculations)
- ✅ Job detail page Overview tab (event dates, venue, notes)
- ✅ Job detail page Financial tab (income editing)
- ✅ Client information display (email, phone)
- ✅ Pull sheet date scheduling

## Note
The migration uses `ADD COLUMN IF NOT EXISTS` so it's safe to run even if some columns already exist. It will only add missing columns and won't affect existing data.
