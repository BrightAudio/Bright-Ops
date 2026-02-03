# Job Completion & Quarterly Revenue Integration Guide

## Overview

Your app now has complete job completion tracking that automatically updates the Financial Dashboard. When you mark a job as completed:

✅ Job status changes to "completed"  
✅ `completed_at` timestamp is recorded  
✅ Quarterly revenue totals update automatically  
✅ Financial Dashboard shows completed jobs  
✅ Revenue progress tracking shows completion percentage  

---

## Database Changes

### New Column Added to `jobs` Table

```sql
completed_at TIMESTAMPTZ  -- Records when job was marked complete
```

### New Trigger: `update_quarterly_revenue_trigger`

Automatically fires when:
1. Job status changes to "completed" (with income set)
2. Income or profit is updated for a completed job

Updates `quarterly_revenue` table with:
- Revenue from job income
- Expenses from labor_cost + total_amortization
- Profit calculation
- Job count increment

### New SQL Functions

1. **`complete_job(job_id UUID)`**
   - Marks job as completed
   - Sets completed_at to current timestamp
   - Triggers quarterly revenue update

2. **`get_completed_jobs_for_quarter(org_id, year, quarter)`**
   - Returns all completed jobs for a quarter
   - Includes profit margin calculations

3. **`get_jobs_by_status(org_id)`**
   - Summary of jobs grouped by status
   - Shows revenue and profit by status

---

## React Components

### 1. JobCompletionButton

**File:** `components/JobCompletion.tsx`

Button to mark a job as complete with confirmation.

**Props:**
```typescript
interface JobCompletionButtonProps {
  jobId: string;              // Job ID to complete
  jobTitle: string;           // Job name (for confirmation)
  currentStatus?: string;     // Current job status
  onSuccess?: () => void;     // Callback when complete
  onError?: (error: string) => void;
}
```

**Example Usage:**
```typescript
import { JobCompletionButton } from '@/components/JobCompletion';

export function JobRow({ job }) {
  const handleSuccess = () => {
    // Refetch jobs or update state
    console.log('Job marked complete!');
  };

  return (
    <tr>
      <td>{job.title}</td>
      <td>
        <JobCompletionButton
          jobId={job.id}
          jobTitle={job.title}
          currentStatus={job.status}
          onSuccess={handleSuccess}
        />
      </td>
    </tr>
  );
}
```

### 2. JobStatusBadge

**File:** `components/JobCompletion.tsx`

Displays job status with color coding.

**Props:**
```typescript
interface JobStatusBadgeProps {
  status?: string;           // 'completed', 'in_progress', 'pending', etc.
  completedAt?: string;      // ISO date when job was completed
}
```

**Colors:**
- Completed: Green
- In Progress: Blue
- Pending: Yellow
- Cancelled: Red

**Example Usage:**
```typescript
<JobStatusBadge 
  status="completed"
  completedAt="2026-02-03T15:30:00Z"
/>
```

### 3. QuarterlyJobStats

**File:** `components/JobCompletion.tsx`

Shows job completion progress and revenue realization.

**Props:**
```typescript
interface QuarterlyJobStatsProps {
  completedCount: number;    // Number of completed jobs
  totalCount: number;        // Total jobs in quarter
  completedRevenue: number;  // Revenue from completed jobs
  totalRevenue: number;      // Total projected revenue
}
```

**Shows:**
- Jobs Completed progress bar (0-100%)
- Revenue Realized progress bar (0-100%)
- Percentages and dollar amounts

**Example Usage:**
```typescript
<QuarterlyJobStats
  completedCount={8}
  totalCount={12}
  completedRevenue={50000}
  totalRevenue={75000}
/>
```

---

## Updated FinancialDashboard

The dashboard now includes a "Completed Jobs This Quarter" section that shows:

- Toggle button to show/hide job details
- Table of all completed jobs with:
  - Job title
  - Event date
  - Completion date
  - Revenue
  - Profit
  - Profit margin %
- Summary cards showing:
  - Total completed jobs
  - Total completed revenue
  - Total completed profit

---

## How Job Completion Works

### Step 1: Mark Job Complete

```typescript
// User clicks "Mark Complete" button
// System updates jobs table:
UPDATE jobs SET 
  status = 'completed',
  completed_at = now()
WHERE id = 'job-id';
```

### Step 2: Trigger Auto-Updates

```sql
-- Trigger automatically fires:
-- Calculates quarter from completed_at date
-- Looks up organization from warehouse
-- Updates quarterly_revenue table:
INSERT INTO quarterly_revenue (organization_id, year, quarter, total_revenue, ...)
VALUES (org_id, 2026, 1, 15000, ...)
ON CONFLICT (organization_id, year, quarter) DO UPDATE SET ...
```

### Step 3: Dashboard Updates

```typescript
// FinancialDashboard automatically fetches:
// 1. Completed jobs for current quarter
// 2. Updated quarterly_revenue totals
// 3. Displays in "Completed Jobs This Quarter" section
```

---

## Integration Examples

### Example 1: Jobs List with Completion Buttons

```typescript
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { JobCompletionButton, JobStatusBadge } from '@/components/JobCompletion';

export function JobsList() {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    setJobs(data || []);
    setIsLoading(false);
  };

  const handleJobComplete = () => {
    // Refetch to show updated status and financial data
    fetchJobs();
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Status</th>
          <th>Revenue</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map(job => (
          <tr key={job.id}>
            <td>{job.title}</td>
            <td>
              <JobStatusBadge 
                status={job.status}
                completedAt={job.completed_at}
              />
            </td>
            <td>${job.income?.toLocaleString()}</td>
            <td>
              <JobCompletionButton
                jobId={job.id}
                jobTitle={job.title}
                currentStatus={job.status}
                onSuccess={handleJobComplete}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Example 2: Financial Page with Completed Jobs

```typescript
'use client';

import { useUser } from '@/lib/hooks/useUser';
import { useQuarterlyRevenue } from '@/lib/hooks/useQuarterlyRevenue';
import { FinancialDashboard } from '@/components/FinancialDashboard';
import { QuarterlyJobStats } from '@/components/JobCompletion';

export default function FinancialPage() {
  const { profile } = useUser();
  const {
    currentQuarterData,
    previousQuartersData,
    yearlyData,
    completedJobs,
    isLoading,
  } = useQuarterlyRevenue(profile?.organization_id || null);

  if (isLoading) return <div>Loading...</div>;

  // Calculate stats
  const totalJobsThisQuarter = currentQuarterData?.jobCount || 0;
  const completedCount = completedJobs.length;
  const completedRevenue = completedJobs.reduce((sum, job) => sum + job.income, 0);
  const totalRevenue = currentQuarterData?.totalRevenue || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Job Completion Progress */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Quarter Completion Status</h2>
        <QuarterlyJobStats
          completedCount={completedCount}
          totalCount={totalJobsThisQuarter}
          completedRevenue={completedRevenue}
          totalRevenue={totalRevenue}
        />
      </div>

      {/* Full Financial Dashboard */}
      <FinancialDashboard
        organizationId={profile?.organization_id || ''}
        currentQuarterData={currentQuarterData}
        previousQuartersData={previousQuartersData}
        yearlyData={yearlyData}
        completedJobs={completedJobs}
      />
    </div>
  );
}
```

### Example 3: Job Detail Page with Completion

```typescript
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { JobCompletionButton, JobStatusBadge } from '@/components/JobCompletion';
import { formatCurrency } from '@/lib/quarterlyRevenue';

export default function JobDetailPage() {
  const params = useParams();
  const [job, setJob] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    fetchJob();
  }, [params.id]);

  const fetchJob = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', params.id)
      .single();
    
    setJob(data);
  };

  if (!job) return <div>Loading...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{job.title}</h1>
            <p className="text-gray-600 mt-2">Event: {new Date(job.event_date).toLocaleDateString()}</p>
          </div>
          <JobStatusBadge 
            status={job.status}
            completedAt={job.completed_at}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-gray-600 text-sm">Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(job.income)}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Profit</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(job.profit)}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Status</p>
            <p className="text-2xl font-bold capitalize">{job.status}</p>
          </div>
        </div>

        {job.status !== 'completed' && (
          <JobCompletionButton
            jobId={job.id}
            jobTitle={job.title}
            currentStatus={job.status}
            onSuccess={() => {
              // Refetch job details
              fetchJob();
              // Show success message
              alert('Job marked as completed!');
            }}
          />
        )}
      </div>
    </div>
  );
}
```

---

## Testing Job Completion

### Test 1: Mark Job Complete
1. Navigate to jobs page
2. Find a job with status "pending" or "in_progress"
3. Click "Mark Complete" button
4. Confirm in dialog
5. Verify status changes to "Completed" (green badge)
6. Verify `completed_at` shows today's date

### Test 2: Financial Dashboard Updates
1. Mark a job complete (with income = $5000, profit = $1500)
2. Navigate to Financial Dashboard
3. Verify quarterly revenue increases by $5000
4. Verify quarterly profit increases by $1500
5. Verify job appears in "Completed Jobs This Quarter" section

### Test 3: Progress Tracking
1. Create 10 jobs in current quarter
2. Mark 3 as completed
3. Check QuarterlyJobStats component
4. Verify shows "3 of 10 (30%)"
5. Mark more jobs complete
6. Verify percentages update

### Test 4: Multi-Job Revenue
1. Mark 5 different jobs complete
2. Each with different revenue amounts
3. Verify quarterly revenue = sum of all job income
4. Verify completed jobs table shows all 5 jobs
5. Verify total revenue in completed jobs section

---

## Database Queries

### Get All Completed Jobs for Current Quarter
```sql
SELECT * FROM completed_jobs_by_quarter
WHERE organization_id = 'org-uuid'
AND year = 2026
AND quarter = 1;
```

### Get Job Summary by Status
```sql
SELECT * FROM get_jobs_by_status('org-uuid');
```

### Get Completed Jobs with Details
```sql
SELECT * FROM get_completed_jobs_for_quarter(
  'org-uuid',
  2026,
  1
);
```

### Mark Job Complete (SQL)
```sql
SELECT * FROM complete_job('job-id');
```

---

## Automatic Data Flow

```
User clicks "Mark Complete"
        ↓
JobCompletionButton updates jobs.status = 'completed'
        ↓
Trigger: update_quarterly_revenue_trigger fires
        ↓
Function calculates quarter from completed_at
        ↓
INSERT/UPDATE quarterly_revenue
        ↓
useQuarterlyRevenue hook detects change
        ↓
FinancialDashboard re-renders with updated data
        ↓
User sees job in "Completed Jobs This Quarter" + updated revenue
```

---

## Next Steps

1. ✅ Run SQL migration: `2026-02-03_job_completion_tracking.sql`
2. ✅ Import JobCompletionButton component in your jobs pages
3. ✅ Import JobStatusBadge for status display
4. ✅ Use QuarterlyJobStats for progress tracking
5. ⏳ Update your job rows to show completion buttons
6. ⏳ Test marking jobs complete
7. ⏳ Verify Financial Dashboard updates automatically

---

## Files Modified/Created

- `sql/migrations/2026-02-03_job_completion_tracking.sql` - Database schema
- `components/JobCompletion.tsx` - Completion UI components
- `components/FinancialDashboard.tsx` - Updated with completed jobs section
- `lib/hooks/useQuarterlyRevenue.ts` - Now fetches completed jobs

---

## Common Issues

**Q: Quarterly revenue didn't update when I marked a job complete**
- A: Make sure the job has `warehouse_id` set (needed to get organization)
- A: Make sure `income` field is set before marking complete
- A: Check SQL migration was run successfully

**Q: Completed job doesn't appear in dashboard**
- A: Refresh the page to trigger useQuarterlyRevenue hook
- A: Make sure job has an `event_date` (needed for quarter calculation)
- A: Check browser console for API errors

**Q: Progress bar shows wrong percentage**
- A: Verify total jobs count includes all statuses (not just completed)
- A: Check that revenue calculation includes all jobs, not just completed

---

This system ensures that as you mark jobs complete throughout the quarter, your financial dashboard automatically updates to reflect actual vs. projected revenue!
