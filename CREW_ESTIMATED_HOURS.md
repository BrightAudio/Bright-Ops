# Crew Estimated Hours Feature - Implementation Complete

## Summary
Added the ability to specify estimated hours for hourly rate crew members, enabling accurate labor cost calculations.

## Changes Made

### 1. Frontend Updates (`app/app/jobs/[id]/page.tsx`)

#### State Management
- Added `estimatedHours` state variable to track user input
- Reset `estimatedHours` in both assignment success and cancel handlers

#### Form Enhancements
- Added "Estimated Hours" input field that appears conditionally when Rate Type is "Hourly"
- Input accepts decimal values (0.5 hour increments)
- Placeholder value: "8.0"

#### Database Integration
- Updated `handleAssignCrew` to save `estimated_hours` when rate type is hourly
- Modified assignment queries to include `estimated_hours` field:
  - Initial load query in `useEffect`
  - Reload query after successful assignment

#### Labor Cost Calculation
**Before:**
```
Hourly Crew: $75.00/hr
```

**After:**
```
Hourly Crew (Estimated): $600.00
24.0 total hours
```

Now calculates actual cost: `rate × estimated_hours` for each crew member

#### Crew List Display
**Before:**
```
John Doe
Audio Engineer
$25.00/hr
```

**After:**
```
John Doe
Audio Engineer
$25.00/hr × 8h = $200.00
```

Shows breakdown: hourly rate × estimated hours = total cost

### 2. Database Migration (`sql/add_estimated_hours.sql`)

Created migration file to add `estimated_hours` column:

```sql
ALTER TABLE job_assignments 
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2);
```

**⚠️ IMPORTANT:** This SQL must be run manually in Supabase SQL Editor

## How It Works

### User Flow
1. Click "Assign Crew Member" button
2. Select employee from dropdown
3. Enter role (e.g., "Audio Engineer")
4. Select "Hourly Rate" from Rate Type dropdown
5. Enter rate amount (e.g., "25.00")
6. **NEW:** Enter estimated hours (e.g., "8.0")
7. Click "Assign"

### Calculation Logic
- **Hourly Crew Summary**: Sums up `rate_amount × estimated_hours` for all hourly crew
- **Day Rate Crew Summary**: Sums up `rate_amount` for all day rate crew (unchanged)
- **Individual Display**: Shows calculation for each hourly crew member

### Conditional Display
- Estimated Hours input only appears when Rate Type = "Hourly"
- Calculation in crew list only shows for hourly crew members with estimated_hours set
- Day rate crew members display normally without hours

## Next Steps

### 1. Run Database Migration
Navigate to Supabase Dashboard → SQL Editor → New Query:

```sql
ALTER TABLE job_assignments 
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2);
```

Click "Run" to execute.

### 2. Test the Feature
1. Navigate to any job: `/app/jobs/[job-id]`
2. Go to "Crew" tab
3. Assign a crew member with hourly rate and estimated hours
4. Verify:
   - Hours field appears when selecting "Hourly Rate"
   - Assignment saves successfully
   - Labor Cost Summary shows calculated total
   - Crew list shows hourly breakdown

### 3. Commit Changes
Once database migration is confirmed working:

```bash
git add .
git commit -m "Added estimated hours field for hourly crew labor cost calculation"
git push origin main
```

## Files Modified

1. `app/app/jobs/[id]/page.tsx` - Job detail page with crew assignment
2. `sql/add_estimated_hours.sql` - Database migration file (NEW)

## Technical Details

**Data Type:** `DECIMAL(5,2)`
- Max value: 999.99 hours
- Precision: 2 decimal places (e.g., 8.50)
- Nullable: Yes (allows NULL for day rate crew)

**Business Logic:**
- Only applies to hourly rate crew (`rate_type = 'hourly'`)
- Day rate crew members have `estimated_hours = NULL`
- Total labor cost = Σ(hourly_rate × estimated_hours) + Σ(day_rates)

## User Preference Notes
✅ Uses inline form (not modal popup) as per user preference
✅ Form already existed, just added new field
✅ Calculations update immediately after assignment
