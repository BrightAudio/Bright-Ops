# Pull Sheet & Job Integration Summary

## What's Implemented

### ✅ Pull Sheet → Job Synchronization

When you update a pull sheet, the related job is automatically updated:

**Date Synchronization:**
- `scheduled_out_at` → `job.start_at`
- `expected_return_at` → `job.end_at`

**Status Synchronization:**
- Pull sheet `draft` → Job `draft` (planning phase)
- Pull sheet `picking` → Job `active` (being prepared)
- Pull sheet `finalized` → Job `active` (ready/in progress)

### ✅ Job Code in Pull Sheets

Pull sheets automatically include the job code in their name:
- Format: `{JOB_CODE} Pull Sheet`
- Example: `JOB-001 Pull Sheet`
- Falls back to job title if no code exists

### ✅ Smart Job Statistics

The jobs page summary stats already calculate based on:
- **This Week**: Jobs with start_at within ±7 days
- **In Progress**: Jobs with status = 'active'
- **Upcoming**: Jobs with start_at > now
- **Total Revenue**: Sum of all job income values

## How It Works

### Creating a Pull Sheet from a Job

1. Job has start_at/end_at dates (optional)
2. Click "Pull Sheet" button
3. Pull sheet created with:
   - Name: `{job.code} Pull Sheet`
   - scheduled_out_at = job.start_at
   - expected_return_at = job.end_at
   - status = 'draft'
   - notes = job.notes

### Updating Pull Sheet Dates

When you update a pull sheet's scheduled/return dates:
1. Pull sheet dates are saved
2. Automatically updates the linked job's start_at/end_at
3. Job appears in correct stats buckets (this week, upcoming, etc.)

### Status Flow

**Planning Phase:**
```
Job created (draft) → Pull sheet created (draft)
```

**Preparation Phase:**
```
Pull sheet → picking status
↓
Job → active status
```

**Ready/In Progress:**
```
Pull sheet → finalized status
↓
Job → active status
```

## Calendar Integration

Jobs will appear on calendars based on:
- `start_at` date (from pull sheet scheduled_out_at)
- `end_at` date (from pull sheet expected_return_at)
- Status (active jobs are in progress)

## Revenue Calculation

Job revenue is calculated from:
- `income` field (total job income)
- `labor_cost` field (calculated from crew assignments)
- `profit` field (auto-calculated: income - labor_cost)

**Summary stats show:**
- Total revenue across all jobs
- Can be filtered by status/date range

## Next Steps (Future Enhancements)

- [ ] Complete job status when pull sheet is returned
- [ ] Track actual vs expected dates
- [ ] Calendar view showing jobs by date
- [ ] Revenue reports and analytics
- [ ] Automated notifications for upcoming jobs
