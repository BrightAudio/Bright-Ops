# ⚡ Quick Start: Quarterly Revenue & Job Completion

## 🚀 Get Running in 5 Minutes

### Step 1: Run SQL Migrations (2 minutes)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `qifhpsazsnmqnbnazrct`
3. Click **SQL Editor**
4. Click **New Query**
5. Copy ALL content from `sql/migrations/2026-02-03_quarterly_revenue_tracking.sql`
6. Paste into SQL editor
7. Click **Run**
8. Wait for success ✅

**Then repeat with:**
- `sql/migrations/2026-02-03_job_completion_tracking.sql`

### Step 2: Regenerate Types (1 minute)

```bash
npx supabase gen types typescript --project-id qifhpsazsnmqnbnazrct > types/database.ts
```

### Step 3: Use the Components (2 minutes)

**Add to your jobs page:**

```typescript
import { JobCompletionButton, JobStatusBadge } from '@/components/JobCompletion';

export function JobRow({ job }) {
  return (
    <tr>
      <td>{job.title}</td>
      <td>
        <JobStatusBadge status={job.status} completedAt={job.completed_at} />
      </td>
      <td>
        <JobCompletionButton
          jobId={job.id}
          jobTitle={job.title}
          currentStatus={job.status}
          onSuccess={() => console.log('Job completed!')}
        />
      </td>
    </tr>
  );
}
```

**Add to your financial page:**

```typescript
import { FinancialDashboard } from '@/components/FinancialDashboard';
import { useQuarterlyRevenue } from '@/lib/hooks/useQuarterlyRevenue';

export default function FinancesPage() {
  const { currentQuarterData, previousQuartersData, yearlyData, completedJobs, isLoading } =
    useQuarterlyRevenue(organizationId);

  if (isLoading) return <div>Loading...</div>;

  return (
    <FinancialDashboard
      organizationId={organizationId}
      currentQuarterData={currentQuarterData}
      previousQuartersData={previousQuartersData}
      yearlyData={yearlyData}
      completedJobs={completedJobs}
    />
  );
}
```

---

## ✨ What You Get

✅ **Mark Jobs Complete** - One-click to mark jobs done  
✅ **Auto Revenue Update** - Quarterly totals update instantly  
✅ **Progress Tracking** - See % of jobs/revenue completed  
✅ **Financial Dashboard** - Complete quarterly overview  
✅ **Historical Data** - All past quarters preserved  
✅ **Year-to-Date** - See full year totals  

---

## 🧪 Quick Test

1. **Create a job with:**
   - Title: "Test Event"
   - Event Date: Today
   - Income: $5,000
   - Status: "pending"

2. **Click "Mark Complete"** on the job

3. **Verify in Financial Dashboard:**
   - Current Quarter Revenue should be $5,000
   - Job should appear in "Completed Jobs This Quarter"

4. **Verify progress bar:**
   - Should show "1 of 1 (100%)"

---

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `sql/migrations/2026-02-03_quarterly_revenue_tracking.sql` | Core quarterly revenue schema |
| `sql/migrations/2026-02-03_job_completion_tracking.sql` | Job completion & auto-update |
| `components/FinancialDashboard.tsx` | Main dashboard component |
| `components/JobCompletion.tsx` | Job completion UI components |
| `components/QuarterlyRevenueCard.tsx` | Quarterly summary cards |
| `lib/quarterlyRevenue.ts` | Utility functions |
| `lib/hooks/useQuarterlyRevenue.ts` | React hook for data |
| `QUARTERLY_REVENUE_SYSTEM.md` | Full documentation |
| `JOB_COMPLETION_GUIDE.md` | Job completion details |
| `QUARTERLY_REVENUE_DATA_FLOW.md` | Architecture & data flow |

---

## 🎯 Common Tasks

### Show Job Status Badge
```typescript
<JobStatusBadge status={job.status} completedAt={job.completed_at} />
```

### Mark Job Complete
```typescript
<JobCompletionButton
  jobId={job.id}
  jobTitle={job.title}
  currentStatus={job.status}
/>
```

### Show Progress Bar
```typescript
<QuarterlyJobStats
  completedCount={5}
  totalCount={10}
  completedRevenue={25000}
  totalRevenue={50000}
/>
```

### Display Financial Dashboard
```typescript
<FinancialDashboard
  organizationId={orgId}
  currentQuarterData={data}
  previousQuartersData={prev}
  yearlyData={yearly}
  completedJobs={jobs}
/>
```

### Get Quarterly Data
```typescript
const { currentQuarterData, completedJobs, isLoading } = 
  useQuarterlyRevenue(organizationId);
```

---

## 🔍 Verify It Works

### Check Database
```sql
-- See quarterly revenue data
SELECT * FROM quarterly_revenue 
WHERE organization_id = 'your-org-id';

-- See completed jobs
SELECT * FROM completed_jobs_by_quarter
WHERE organization_id = 'your-org-id';
```

### Check Browser Console
- No errors after marking job complete
- useQuarterlyRevenue hook logs data fetching
- Supabase subscription active

### Check Dashboard
- Current Quarter Revenue card shows value
- Quarterly Breakdown shows Q1-Q4 data
- Completed Jobs table shows your job
- Progress bars show correct percentages

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| No data showing | Check jobs have `warehouse_id` and `event_date` |
| Revenue not updating | Ensure job has `income` > 0 before completing |
| SQL migration fails | Check for syntax errors in migration |
| Types not updated | Run `npx supabase gen types typescript...` |
| Dashboard blank | Check console for API errors |
| Progress bar stuck | Refresh page to re-fetch data |

---

## 📚 Next Steps

1. ✅ Run migrations
2. ✅ Test with sample job
3. ⏳ Integrate into your jobs list
4. ⏳ Show financial dashboard to users
5. ⏳ Add email alerts for revenue milestones
6. ⏳ Export reports to PDF/CSV

---

## 💡 Pro Tips

- Always set `warehouse_id` on jobs (needed for organization lookup)
- Use `event_date` for quarter assignment (not `created_at`)
- Mark jobs complete as they happen for accurate tracking
- Check Financial Dashboard weekly for revenue trends
- Review completed jobs for profit margin analysis

---

## 📞 Need Help?

See detailed guides:
- `QUARTERLY_REVENUE_SYSTEM.md` - Complete reference
- `JOB_COMPLETION_GUIDE.md` - Job completion details  
- `QUARTERLY_REVENUE_DATA_FLOW.md` - Architecture & flow

---

**Ready to go! Your quarterly revenue system is now active.** 🎉

Every time you mark a job complete, your financial dashboard updates automatically!
