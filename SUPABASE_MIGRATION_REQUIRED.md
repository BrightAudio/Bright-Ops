# CRITICAL: Database Schema Issues - Action Required

## Problem Summary
The site won't start because of database schema conflicts. The codebase was using THREE different sets of field names for job dates:

1. **Old schema**: `event_date`, `load_in_date`, `load_out_date`, `prep_start_date`
2. **Newer schema**: `start_date`, `end_date`, `expected_return_date`  
3. **Current schema (TypeScript types)**: `start_at`, `end_at`

## What I Fixed in Code
✅ Updated `MySchedule.tsx` to use `start_at`/`end_at`
✅ Updated `useGigCalendar.ts` to use `start_at`/`end_at`
✅ Updated `GigCalendar.tsx` to use `start_at`/`end_at`
✅ Standardized all code on `start_at`/`end_at` fields
✅ Created unified migration file: `sql/migrations/2025-11-12_unified_job_schema.sql`

## What You MUST Do in Supabase

### CRITICAL - Run this SQL in Supabase SQL Editor:

Open Supabase Dashboard → SQL Editor → Run this:

```sql
-- Add all necessary fields to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS venue TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS income DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(10, 2) DEFAULT 0;

-- Add computed profit column
ALTER TABLE jobs DROP COLUMN IF EXISTS profit;
ALTER TABLE jobs 
ADD COLUMN profit DECIMAL(10, 2) GENERATED ALWAYS AS (COALESCE(income, 0) - COALESCE(labor_cost, 0)) STORED;

-- Add client reference
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add client contact fields
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_jobs_start_at ON jobs(start_at);
CREATE INDEX IF NOT EXISTS idx_jobs_end_at ON jobs(end_at);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
```

### After Running Migration:

1. Verify the fields exist:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND column_name IN ('start_at', 'end_at', 'venue', 'notes', 'income', 'labor_cost', 'profit', 'client_id');
```

2. If you have existing data with old field names (`start_date`, `event_date`, etc.), migrate it:
```sql
-- Copy data from old fields to new fields (if they exist)
UPDATE jobs SET start_at = start_date WHERE start_at IS NULL AND start_date IS NOT NULL;
UPDATE jobs SET end_at = end_date WHERE end_at IS NULL AND end_date IS NOT NULL;
UPDATE jobs SET start_at = event_date WHERE start_at IS NULL AND event_date IS NOT NULL;
```

## Why Site is Crashing

The dev server starts but immediately crashes because:
1. Code is querying for `start_at` and `end_at` fields
2. These fields don't exist in your Supabase database yet
3. Supabase returns an error
4. The error crashes the application on first page load

## After Migration

Once you run the SQL migration above, the site should work. The dev server will:
- ✅ Start successfully
- ✅ Load pages without crashing
- ✅ Display jobs with proper dates
- ✅ Show schedule in MySchedule widget
- ✅ Allow editing job dates in calendar

## Files Updated
- `components/MySchedule.tsx` - Fixed to use `start_at`/`end_at`
- `lib/hooks/useGigCalendar.ts` - Fixed to use `start_at`/`end_at`
- `components/GigCalendar.tsx` - Fixed to use `start_at`/`end_at`
- Created: `sql/migrations/2025-11-12_unified_job_schema.sql` - Run this in Supabase!

## Next Steps
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and run the migration SQL above
4. Restart your dev server: `npm run dev`
5. Site should now work!
