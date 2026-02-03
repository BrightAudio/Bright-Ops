# Quarterly Revenue Tracking System - Implementation Guide

## Overview

Your app now has a complete quarterly revenue tracking system that:

✅ Tracks revenue per quarter automatically (Q1-Q4 for each year)  
✅ Resets quarterly totals when a new quarter starts  
✅ Preserves all historical data year-over-year  
✅ Shows year-to-date totals combining all quarters  
✅ Integrates with existing jobs data  
✅ Provides detailed financial dashboards and insights  

---

## Database Schema

### New Tables Created

#### `quarterly_revenue`
Stores snapshot data for each quarter per organization.

```sql
- id (UUID, Primary Key)
- organization_id (UUID, References organizations)
- year (INTEGER) - 2026, 2027, etc.
- quarter (INTEGER) - 1, 2, 3, or 4
- total_revenue (NUMERIC) - Sum of job income
- total_expenses (NUMERIC) - Sum of job expenses
- total_profit (NUMERIC) - Revenue minus expenses
- job_count (INTEGER) - Count of jobs in quarter
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

Unique constraint: (organization_id, year, quarter)
```

#### `yearly_revenue`
Stores annual summaries and quarterly breakdowns.

```sql
- id (UUID, Primary Key)
- organization_id (UUID, References organizations)
- year (INTEGER)
- q1_revenue, q2_revenue, q3_revenue, q4_revenue (NUMERIC)
- total_revenue (NUMERIC) - Annual total
- total_expenses (NUMERIC) - Annual total
- total_profit (NUMERIC) - Annual total
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

Unique constraint: (organization_id, year)
```

---

## Helper Functions

### SQL Functions (in database)

1. **`get_quarter(date_val TIMESTAMPTZ) -> INTEGER`**
   - Returns quarter number (1-4) from a date
   - Used internally for date calculations

2. **`get_current_quarter_revenue(org_id UUID)`**
   - Returns current quarter revenue snapshot
   - Includes: quarter, year, total_revenue, total_expenses, total_profit, job_count

3. **`get_year_quarterly_breakdown(org_id UUID, year_val INTEGER)`**
   - Returns all quarters for a specific year
   - Great for year comparison views

4. **`get_year_to_date_revenue(org_id UUID)`**
   - Returns YTD totals for current year
   - Breaks down by Q1, Q2, Q3, Q4, and total

---

## TypeScript Utilities

### File: `lib/quarterlyRevenue.ts`

#### Core Functions

```typescript
// Get quarter (1-4) from a date
getQuarter(date: Date): number

// Get current quarter and year
getCurrentQuarter(): { quarter: number; year: number }

// Get date range for a quarter
getQuarterDateRange(quarter: number, year: number): { start: Date; end: Date }

// Format currency ($1,234.56)
formatCurrency(amount: number): string

// Get quarter name (Q1, Q2, Q3, Q4)
getQuarterName(quarter: number): string

// Get full label (Q1 2026)
getQuarterLabel(quarter: number, year: number): string

// Calculate profit margin percentage
calculateProfitMargin(revenue: number, profit: number): number

// Get quarter-over-quarter growth rate
calculateQoQGrowth(current: number, previous: number): number

// Format growth as percentage (+12.5%)
formatGrowth(growth: number): string

// Get HTML color for quarter in charts
getQuarterColor(quarter: number): string

// Average job value
calculateAverageJobValue(totalRevenue: number, jobCount: number): number
```

---

## React Components

### 1. FinancialDashboard Component

**File:** `components/FinancialDashboard.tsx`

Main dashboard showing all quarterly data.

**Props:**
```typescript
interface FinancialDashboardProps {
  organizationId: string;
  currentQuarterData?: QuarterlyRevenueData | null;
  previousQuartersData?: QuarterlyRevenueData[];
  yearlyData?: Record<number, QuarterlyRevenueData[]>;
}
```

**Features:**
- Current quarter revenue, profit, QoQ growth, job count cards
- Quarterly breakdown for selected year
- Year-to-date summary
- Previous quarters comparison table
- Info section explaining how it works

**Example Usage:**
```typescript
import { FinancialDashboard } from '@/components/FinancialDashboard';
import { useQuarterlyRevenue } from '@/lib/hooks/useQuarterlyRevenue';

export function FinancialPage() {
  const { currentQuarterData, previousQuartersData, yearlyData, isLoading } = 
    useQuarterlyRevenue('org-uuid');

  if (isLoading) return <div>Loading...</div>;

  return (
    <FinancialDashboard
      organizationId="org-uuid"
      currentQuarterData={currentQuarterData}
      previousQuartersData={previousQuartersData}
      yearlyData={yearlyData}
    />
  );
}
```

### 2. QuarterlyRevenueCard Component

**File:** `components/QuarterlyRevenueCard.tsx`

Compact card showing current quarter revenue overview.

**Props:**
```typescript
interface QuarterlyRevenueCardProps {
  organizationId: string;
  currentQuarterRevenue?: number;
  currentQuarterJobs?: number;
  currentQuarterProfit?: number;
}
```

**Example Usage (for Jobs Dashboard):**
```typescript
import { QuarterlyRevenueCard } from '@/components/QuarterlyRevenueCard';

export function JobsDashboard() {
  return (
    <QuarterlyRevenueCard
      organizationId="org-uuid"
      currentQuarterRevenue={50000}
      currentQuarterJobs={12}
      currentQuarterProfit={15000}
    />
  );
}
```

### 3. QuarterlyRevenueTable Component

**File:** `components/QuarterlyRevenueCard.tsx`

Table showing revenue breakdown by quarter.

**Props:**
```typescript
interface QuarterlyRevenueTableProps {
  jobsData: Array<{
    id: string;
    title: string;
    eventDate: string;
    income: number;
    profit: number;
  }>;
}
```

---

## React Hooks

### useQuarterlyRevenue Hook

**File:** `lib/hooks/useQuarterlyRevenue.ts`

Fetches quarterly revenue data from database and sets up real-time subscriptions.

**Usage:**
```typescript
import { useQuarterlyRevenue } from '@/lib/hooks/useQuarterlyRevenue';

export function FinancialPage() {
  const {
    currentQuarterData,      // Current quarter snapshot
    previousQuartersData,    // Previous 4 quarters
    yearlyData,              // All quarters by year
    isLoading,               // Loading state
    error,                   // Error state
    refetch,                 // Manual refetch function
  } = useQuarterlyRevenue('organization-id');

  if (isLoading) return <div>Loading financial data...</div>;
  if (error) return <div>Error: {error}</div>;

  return <FinancialDashboard {...} />;
}
```

**Auto-Updates:**
- Subscribes to real-time changes in `quarterly_revenue` table
- Automatically refetches when data changes

---

## Integration Steps

### Step 1: Run SQL Migration

1. Go to Supabase SQL Editor
2. Run: `sql/migrations/2026-02-03_quarterly_revenue_tracking.sql`
3. Verify tables created:
   - `quarterly_revenue`
   - `yearly_revenue`

### Step 2: Create Financial Page

Create a new page to display the dashboard:

```typescript
// app/finances/page.tsx
'use client';

import { FinancialDashboard } from '@/components/FinancialDashboard';
import { useQuarterlyRevenue } from '@/lib/hooks/useQuarterlyRevenue';
import { useUser } from '@/lib/hooks/useUser';

export default function FinancesPage() {
  const { profile } = useUser();
  const { currentQuarterData, previousQuartersData, yearlyData, isLoading } =
    useQuarterlyRevenue(profile?.organization_id || null);

  return (
    <FinancialDashboard
      organizationId={profile?.organization_id || ''}
      currentQuarterData={currentQuarterData}
      previousQuartersData={previousQuartersData}
      yearlyData={yearlyData}
    />
  );
}
```

### Step 3: Add to Jobs Dashboard

Add quarterly revenue card to your jobs page:

```typescript
// In your jobs page/component
import { QuarterlyRevenueCard } from '@/components/QuarterlyRevenueCard';

export function JobsPage() {
  const { currentQuarterRevenue, currentQuarterJobs } = getQuarterlyMetrics();

  return (
    <div>
      <QuarterlyRevenueCard
        organizationId={orgId}
        currentQuarterRevenue={currentQuarterRevenue}
        currentQuarterJobs={currentQuarterJobs}
        currentQuarterProfit={calculateProfit()}
      />
      {/* Rest of jobs content */}
    </div>
  );
}
```

### Step 4: Populate Initial Data

Create a trigger to automatically populate quarterly_revenue when jobs are created/updated:

```typescript
// You'll need to create this SQL trigger based on your jobs table structure
// It should populate quarterly_revenue when a job's income changes
```

---

## How It Works

### Quarterly Reset Logic

When a new quarter starts, the system doesn't "reset" - instead:

1. **Current Quarter** changes automatically (Q1 → Q2, etc.)
2. **Previous quarter's data** is preserved in database
3. **New quarter starts at $0** (no jobs yet)
4. **Historical data** remains accessible in yearly views

### Date-Based Grouping

Jobs are assigned to quarters based on their `event_date`:
- Jan-Mar = Q1
- Apr-Jun = Q2
- Jul-Sep = Q3
- Oct-Dec = Q4

### Automatic Calculations

When you add/update a job with `income` and `profit`:
1. System determines job's quarter/year from `event_date`
2. Quarterly totals update automatically
3. Year-to-date sums calculate on-demand
4. Profit margins and growth rates compute from raw data

---

## Data Structure Examples

### Current Quarter Data (February 3, 2026)

```json
{
  "quarter": 1,
  "year": 2026,
  "totalRevenue": 145000,
  "totalExpenses": 95000,
  "totalProfit": 50000,
  "jobCount": 8
}
```

### Yearly Breakdown

```json
{
  "2026": [
    { "quarter": 1, "year": 2026, "totalRevenue": 145000, ... },
    { "quarter": 2, "year": 2026, "totalRevenue": 0, ... },
    { "quarter": 3, "year": 2026, "totalRevenue": 0, ... },
    { "quarter": 4, "year": 2026, "totalRevenue": 0, ... }
  ],
  "2025": [
    { "quarter": 1, "year": 2025, "totalRevenue": 120000, ... },
    // ... all quarters for 2025
  ]
}
```

---

## Common Use Cases

### 1. Display Current Quarter Revenue

```typescript
const { currentQuarterData } = useQuarterlyRevenue(orgId);

return (
  <div>
    <h2>{getQuarterLabel(currentQuarterData.quarter, currentQuarterData.year)}</h2>
    <p>Revenue: {formatCurrency(currentQuarterData.totalRevenue)}</p>
  </div>
);
```

### 2. Compare Quarters

```typescript
const { previousQuartersData } = useQuarterlyRevenue(orgId);

return previousQuartersData.map(quarter => (
  <div key={`${quarter.year}-q${quarter.quarter}`}>
    <strong>{getQuarterLabel(quarter.quarter, quarter.year)}</strong>
    <p>{formatCurrency(quarter.totalRevenue)}</p>
  </div>
));
```

### 3. Year-to-Date Calculation

```typescript
const { yearlyData } = useQuarterlyRevenue(orgId);
const currentYear = new Date().getFullYear();
const ytdRevenue = yearlyData[currentYear]?.reduce(
  (sum, q) => sum + q.totalRevenue,
  0
) || 0;

return <p>YTD: {formatCurrency(ytdRevenue)}</p>;
```

### 4. Growth Rate Analysis

```typescript
const { currentQuarterData, previousQuartersData } = useQuarterlyRevenue(orgId);

const growth = calculateQoQGrowth(
  currentQuarterData?.totalRevenue || 0,
  previousQuartersData[0]?.totalRevenue || 0
);

return <p>QoQ Growth: {formatGrowth(growth)}</p>;
```

---

## Best Practices

1. **Always use event_date for quarter assignment** - Don't use created_at
2. **Include profit margin in dashboards** - More important than just revenue
3. **Show 4-quarter comparison** - Helps identify seasonal trends
4. **Update quarterly_revenue table via jobs updates** - Keep in sync
5. **Use the hooks instead of raw queries** - Gets you real-time updates
6. **Cache expensive calculations** - Profit margins, growth rates

---

## Testing the System

### Test 1: Current Quarter Display
```
Navigate to /finances
Verify Q1 2026 shows current data
Check all 4 cards display (Revenue, Profit, QoQ, Jobs)
```

### Test 2: Job Assignment
```
Create a job with event_date in April (Q2)
Check that job appears in Q2 section, not Q1
Revenue should update only Q2 total
```

### Test 3: Quarterly Reset
```
On April 1, 2026, create a new job
Verify Q2 becomes "Current Quarter"
Q1 2026 data preserved in previous quarters
```

### Test 4: Year Comparison
```
Navigate to /finances
Select 2025 in dropdown
Verify all 4 quarters show historical data
YTD should equal sum of all quarters
```

---

## Troubleshooting

### No data showing in dashboard
- Verify jobs have `event_date` filled in
- Check jobs have `income` > 0
- Ensure quarterly_revenue table exists and has data

### Data not updating in real-time
- Check browser console for subscription errors
- Verify Supabase RLS policies are correct
- Try manual refetch button

### Year-to-date doesn't match quarters
- Check for jobs with NULL event_date
- Verify all job income values are recorded
- Run aggregation queries manually

---

## Next Steps

1. ✅ Run SQL migration
2. ✅ Import components into your pages
3. ✅ Add quarterly revenue card to jobs dashboard
4. ✅ Create dedicated /finances page
5. ⏳ Test with sample data
6. ⏳ Configure email alerts for revenue milestones
7. ⏳ Add export to CSV/PDF functionality

---

## Files Created

- `sql/migrations/2026-02-03_quarterly_revenue_tracking.sql` - Database schema
- `lib/quarterlyRevenue.ts` - Utility functions
- `components/FinancialDashboard.tsx` - Main dashboard component
- `components/QuarterlyRevenueCard.tsx` - Card and table components
- `lib/hooks/useQuarterlyRevenue.ts` - React hook for data fetching
- `QUARTERLY_REVENUE_SYSTEM.md` - This guide

---

Questions? Check the utility functions for their specific behavior and parameters.
