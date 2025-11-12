# Database Schema Conflict Analysis

## Problem
The codebase has conflicting database field names for the jobs table:

### Three Migration Files with Different Schemas:
1. **2025-11-09_add_job_dates.sql**: `event_date`, `load_in_date`, `load_out_date`, `prep_start_date`
2. **20251111000003_add_job_dates.sql**: `event_date`, `start_date`, `end_date`, `load_in_date`, `load_out_date`, `prep_start_date`, `expected_return_date`, `venue`, `assigned_crew`, `notes`
3. **2025-11-12_add_job_fields_for_ui.sql**: `start_at`, `end_at`, `venue`, `notes`, `income`, `labor_cost`, `profit`, `client_id`

### TypeScript Type Definition (types/database.ts):
Uses: `start_at`, `end_at`, `venue`, `notes`, `income`, `labor_cost`, `profit`, `client_id`

### Code Usage:
- **MySchedule.tsx**: Fixed to use `start_at`, `end_at` ✓
- **useGigCalendar.ts**: Uses `event_date`, `start_date`, `end_date` ✗
- **GigCalendar.tsx**: Uses `event_date`, `start_date`, `end_date` ✗
- **usePullSheets.ts**: Uses `start_at`, `end_at` ✓
- **Jobs pages**: Uses `start_at`, `end_at` ✓

## Solution Options:

### Option 1: Standardize on start_at/end_at (RECOMMENDED)
- Update useGigCalendar.ts and GigCalendar.tsx to use start_at/end_at
- Remove or consolidate migration files
- Add event_date as computed or mapped field if needed for calendar

### Option 2: Add all fields to database
- Run all migrations to have both sets of fields
- Keep code mapping between them
- More complexity, potential for data inconsistency

## Immediate Fix Needed:
Update useGigCalendar.ts and GigCalendar.tsx to use start_at/end_at instead of event_date/start_date/end_date
