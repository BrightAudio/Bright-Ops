# Quarterly Revenue System - Complete Data Flow

## System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    BRIGHT AUDIO APP                             │
│                 Quarterly Revenue System                        │
└────────────────────────────────────────────────────────────────┘

                          FRONTEND LAYER
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│  JobCompletionButton          FinancialDashboard               │
│  ├─ Mark Complete             ├─ Current Quarter Card          │
│  ├─ Confirmation Dialog       ├─ Quarterly Breakdown           │
│  └─ Status Update             ├─ Year-to-Date Summary          │
│                               ├─ Previous Quarters Table       │
│  JobStatusBadge               ├─ Completed Jobs Section        │
│  ├─ Status Color              └─ Info Section                  │
│  ├─ Completion Date           │
│  └─ Badge Display             QuarterlyRevenueCard             │
│                               ├─ Current Revenue              │
│  QuarterlyJobStats            ├─ Current Profit               │
│  ├─ Job Progress Bar          ├─ Margin %                     │
│  ├─ Revenue Progress Bar      └─ Jobs Count                   │
│  └─ Percentages               │
│                               QuarterlyRevenueTable            │
│                               └─ Revenue by Quarter            │
│                                                                  │
└──────────────┬───────────────────────────────────────────────────┘
               │
               │  useQuarterlyRevenue Hook
               │  ├─ Fetches quarterly_revenue
               │  ├─ Fetches completed_jobs
               │  ├─ Subscribes to changes (real-time)
               │  └─ Auto-refetch on updates
               │
               ▼
                          DATA LAYER (Supabase)
┌─────────────────────────────────────────────────────────────────┐
│  TABLES                                                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ jobs                                                      │   │
│  │ ├─ id, title, status, event_date, completed_at ◀────┐  │   │
│  │ ├─ income, profit, labor_cost, total_amortization   │  │   │
│  │ └─ warehouse_id                                      │  │   │
│  └────────────────────┬─────────────────────────────────┘   │   │
│                       │                                       │   │
│                       ├─► TRIGGER: update_quarterly_revenue  │   │
│                       │   (fires on UPDATE)                   │   │
│                       │                                       │   │
│                       ▼                                       │   │
│  ┌──────────────────────────────────────────────────────┐   │   │
│  │ quarterly_revenue                                    │   │   │
│  │ ├─ organization_id, year, quarter (composite key)   │   │   │
│  │ ├─ total_revenue (SUM of completed job income)     │   │   │
│  │ ├─ total_expenses (SUM of job expenses)            │   │   │
│  │ ├─ total_profit (revenue - expenses)               │   │   │
│  │ └─ job_count (COUNT of completed jobs)             │   │   │
│  └──────────────────────────────────────────────────────┘   │   │
│                       │                                       │   │
│                       │                                       │   │
│  ┌──────────────────────────────────────────────────────┐   │   │
│  │ yearly_revenue                                       │   │   │
│  │ ├─ organization_id, year (composite key)            │   │   │
│  │ ├─ q1_revenue, q2_revenue, q3_revenue, q4_revenue  │   │   │
│  │ ├─ total_revenue (SUM of quarters)                 │   │   │
│  │ ├─ total_expenses (SUM of quarters)                │   │   │
│  │ └─ total_profit (SUM of quarters)                  │   │   │
│  └──────────────────────────────────────────────────────┘   │   │
│                       │                                       │   │
│                       │                                       │   │
│  ┌──────────────────────────────────────────────────────┐   │   │
│  │ completed_jobs_by_quarter (VIEW)                     │   │   │
│  │ ├─ id, title, event_date, completed_at             │   │   │
│  │ ├─ income, profit                                   │   │   │
│  │ ├─ quarter, year                                    │   │   │
│  │ └─ organization_id                                  │   │   │
│  └──────────────────────────────────────────────────────┘   │   │
│                       │                                       │   │
│  FUNCTIONS/PROCEDURES                                         │   │
│  ├─ get_quarter(date) → INTEGER (1-4)                        │   │
│  ├─ complete_job(job_id) → void                              │   │
│  ├─ get_current_quarter_revenue(org_id) → rows               │   │
│  ├─ get_year_quarterly_breakdown(org_id, year) → rows        │   │
│  ├─ get_year_to_date_revenue(org_id) → rows                  │   │
│  ├─ get_completed_jobs_for_quarter(org_id, y, q) → rows      │   │
│  └─ get_jobs_by_status(org_id) → rows                        │   │
│                                                                │   │
│  INDEXES                                                       │   │
│  ├─ idx_quarterly_revenue_org_year                           │   │
│  ├─ idx_quarterly_revenue_org_quarter                        │   │
│  ├─ idx_yearly_revenue_org_year                              │   │
│  ├─ idx_jobs_completed_at                                    │   │
│  └─ idx_jobs_status_completed                                │   │
│                                                                │   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Marking a Job Complete

```
┌──────────────────────────────────────────────────────────────┐
│ Step 1: User Interaction                                     │
│ User clicks "Mark Complete" on job                           │
│ JobCompletionButton shows confirmation dialog               │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 2: Button Update                                        │
│ JobCompletionButton makes update to jobs:                   │
│                                                              │
│ const { data, error } = await supabase                      │
│   .from('jobs')                                             │
│   .update({                                                 │
│     status: 'completed',                                    │
│     completed_at: now()                                     │
│   })                                                        │
│   .eq('id', jobId)                                          │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 3: Database Trigger                                    │
│ PostgreSQL AFTER UPDATE trigger fires:                      │
│                                                              │
│ TRIGGER: update_quarterly_revenue_trigger                   │
│   ON jobs                                                   │
│   FOR EACH ROW                                              │
│   EXECUTE update_quarterly_revenue_on_job_update()          │
│                                                              │
│ Trigger calculates:                                         │
│ - quarter = get_quarter(NEW.completed_at)                  │
│ - year = EXTRACT(YEAR FROM NEW.completed_at)              │
│ - org_id = SELECT organization_id FROM warehouses          │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 4: Quarterly Revenue Update                            │
│ Trigger performs INSERT or UPDATE on quarterly_revenue:     │
│                                                              │
│ INSERT INTO quarterly_revenue (                             │
│   organization_id,                                          │
│   year,                                                     │
│   quarter,                                                  │
│   total_revenue = job.income,                              │
│   total_expenses = job.labor_cost + job.amortization,      │
│   total_profit = job.profit,                               │
│   job_count = 1                                            │
│ ) ON CONFLICT (org_id, year, quarter)                       │
│   DO UPDATE SET                                             │
│     total_revenue += excluded.total_revenue,                │
│     total_expenses += excluded.total_expenses,              │
│     total_profit += excluded.total_profit,                  │
│     job_count += excluded.job_count                         │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 5: Real-Time Subscription                              │
│ useQuarterlyRevenue hook detects change:                    │
│                                                              │
│ supabase                                                    │
│   .channel('quarterly_revenue:org_id')                      │
│   .on('postgres_changes', { ... }, () => {                  │
│     refetch quarterly data                                  │
│   })                                                        │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 6: State Update                                        │
│ Hook updates React state:                                   │
│                                                              │
│ setCurrentQuarterData({                                     │
│   totalRevenue: X,                                          │
│   totalProfit: Y,                                           │
│   jobCount: Z,                                              │
│   ...                                                       │
│ })                                                          │
│                                                              │
│ setCompletedJobs([                                          │
│   { id, title, income, profit, completedAt },              │
│   ...                                                       │
│ ])                                                          │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 7: Component Re-render                                 │
│ FinancialDashboard re-renders with new data:               │
│                                                              │
│ ✓ Current Quarter Revenue Card updates                      │
│ ✓ Quarterly Breakdown shows updated Q1-Q4                   │
│ ✓ Year-to-Date Summary recalculates                         │
│ ✓ Completed Jobs table shows new job                        │
│ ✓ Progress bars update percentages                          │
│                                                              │
│ JobStatusBadge shows "Completed"                            │
│ QuarterlyJobStats updates progress                          │
└──────────────────────────────────────────────────────────────┘
```

---

## Quarter Calculation Logic

```
JOB EVENT DATE → GET QUARTER
January 1        →  Q1 (1)
February 15      →  Q1 (1)
March 31         →  Q1 (1)
April 1          →  Q2 (2)
May 10           →  Q2 (2)
June 30          →  Q2 (2)
July 1           →  Q3 (3)
August 20        →  Q3 (3)
September 30     →  Q3 (3)
October 1        →  Q4 (4)
November 15      →  Q4 (4)
December 31      →  Q4 (4)

Formula: CEIL(MONTH / 3)
```

---

## Revenue Aggregation

```
Current Quarter (Q1 2026)
├─ Job 1: Income=$10,000 → quarterly_revenue.total_revenue += 10,000
├─ Job 2: Income=$15,000 → quarterly_revenue.total_revenue += 15,000
├─ Job 3: Income=$8,000  → quarterly_revenue.total_revenue += 8,000
└─ Total: $33,000

Year-to-Date (2026)
├─ Q1: $33,000
├─ Q2: $42,000
├─ Q3: $0 (not yet)
├─ Q4: $0 (not yet)
└─ Total: $75,000

Previous Quarter (Q4 2025)
├─ Q4 2025: $65,000 (historical, preserved)
└─ Available in yearly_revenue for comparison
```

---

## Component Props Flow

```
FinancialDashboard
├─ organizationId: string
├─ currentQuarterData?: {
│   quarter: number
│   year: number
│   totalRevenue: number
│   totalExpenses: number
│   totalProfit: number
│   jobCount: number
│ }
├─ previousQuartersData?: QuarterlyRevenueData[]
├─ yearlyData?: {
│   [year: number]: QuarterlyRevenueData[]
│ }
└─ completedJobs?: {
    id: string
    title: string
    eventDate: string
    completedAt: string
    income: number
    profit: number
    marginPercent: number
  }[]
```

---

## Database Relationships

```
organizations
    │
    ├──► warehouses (1:many)
    │        │
    │        └──► jobs (1:many)
    │             ├─ income
    │             ├─ profit
    │             ├─ completed_at
    │             └─ event_date
    │
    └──► quarterly_revenue (1:many)
         ├─ total_revenue (derived from jobs.income)
         ├─ total_profit (derived from jobs.profit)
         └─ job_count (COUNT of jobs)

    ├──► yearly_revenue (1:many)
         ├─ q1_revenue (SUM of Q1 quarterly_revenue)
         ├─ q2_revenue (SUM of Q2 quarterly_revenue)
         ├─ q3_revenue (SUM of Q3 quarterly_revenue)
         ├─ q4_revenue (SUM of Q4 quarterly_revenue)
         └─ total_revenue (SUM of all quarters)
```

---

## Automatic vs Manual Triggers

### Automatic (No Code Required)
✅ Mark job as completed  
✅ quarterly_revenue table updates (trigger)  
✅ FinancialDashboard re-renders (subscription)  

### Manual (If Needed)
⚙️ Manually call `complete_job(job_id)` function  
⚙️ Manually query quarterly_revenue data  
⚙️ Manually call `get_year_to_date_revenue()` function  

---

## Performance Optimizations

1. **Indexes**
   - `idx_quarterly_revenue_org_year` - Fast lookup by org + year
   - `idx_jobs_completed_at` - Fast filtering by completion date
   - `idx_jobs_status_completed` - Fast query for completed jobs

2. **Caching**
   - currentQuarterData cached in React state
   - yearlyData stored in object for quick lookups
   - View `completed_jobs_by_quarter` pre-aggregates data

3. **Real-Time Updates**
   - Supabase subscriptions only trigger on changes
   - Component re-renders only when data changes
   - No polling or constant requests

---

## Testing Scenarios

### Scenario 1: Single Job Completion
1. Create job with income=$5,000, profit=$1,500
2. Mark as complete
3. Verify quarterly_revenue increases by $5,000 revenue
4. Verify quarterly_revenue increases by $1,500 profit
5. Verify job appears in completed_jobs_by_quarter view

### Scenario 2: Multiple Quarters
1. Create jobs in Q1 with total revenue $50,000
2. Create jobs in Q2 with total revenue $40,000
3. Mark all jobs complete
4. Verify quarterly_revenue shows Q1=$50k, Q2=$40k
5. Verify yearly_revenue shows total=$90k

### Scenario 3: Year-to-Date Progression
1. Q1 2026: Mark 5 jobs complete = $50k revenue
2. Q2 2026: Mark 6 jobs complete = $60k revenue
3. Q3 2026: No jobs yet = $0k revenue
4. Q4 2026: No jobs yet = $0k revenue
5. Verify yearly_revenue.total_revenue = $110k
6. Verify year_to_date_revenue function returns $110k

---

## Error Handling

```
User marks job complete
  │
  ├─ No warehouse_id on job
  │  └─ Trigger skips (can't get org_id)
  │
  ├─ income = NULL
  │  └─ Trigger skips (no revenue to track)
  │
  ├─ completed_at already set
  │  └─ Updates existing quarterly_revenue record
  │
  └─ Success
     └─ quarterly_revenue updates, UI refreshes
```

---

This architecture ensures:
✅ Real-time updates across all users  
✅ Automatic data consistency  
✅ Historical data preservation  
✅ Multi-tenant isolation  
✅ Optimal query performance  
