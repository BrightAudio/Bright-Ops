# Quest Events System - Deployment Guide

## Phase 1: Database Setup

### Step 1: Create the quest_events Table

**Option A: Supabase SQL Editor (Recommended - 2 minutes)**

1. Go to Supabase dashboard → Your project → SQL Editor
2. Click "New Query"
3. Paste the entire contents of `migrations/001_create_quest_events.sql`
4. Click "Run"
5. Confirm the table appears in the Tables list

**Option B: CLI (if installed)**
```bash
psql postgresql://user:password@db.supabase.co:5432/postgres < migrations/001_create_quest_events.sql
```

### Step 2: Verify Table Creation

In Supabase SQL Editor, run:
```sql
SELECT * FROM quest_events LIMIT 1;
```

Should return: `(0 rows)` - meaning table exists but is empty. ✅

---

## Phase 2: Test Event Logging

### Step 1: Start Dev Server
```bash
npm run dev
```

### Step 2: Test the API

**Option A: Browser**
- Navigate to: `http://localhost:3000/api/test/event-logging`
- You'll see the endpoint documentation

**Option B: cURL**
```bash
curl -X POST http://localhost:3000/api/test/event-logging
```

**Expected Response:**
```json
{
  "success": true,
  "event": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "event_type": "lead_reachout_sent",
    "entity_type": "lead",
    "entity_id": "test-lead-001",
    "metric_value": 1,
    "source": "system",
    "metadata": {
      "test": true,
      "timestamp": "2026-02-26T...",
      "message": "This is a test event from event-logging API"
    },
    "created_at": "2026-02-26T..."
  },
  "message": "Test event logged successfully"
}
```

### Step 3: Verify Data in Supabase

1. Go to Supabase → Table Editor
2. Click on `quest_events` table
3. You should see the test event row with `event_type = lead_reachout_sent`

---

## Phase 3: Ready for Production

Once table is created and test event logs successfully:

✅ Event infrastructure is live
✅ All Leads module actions auto-fire events
✅ Quest progress can consume events
✅ Ready to implement Enterprise tier gating

**Next Steps:**
1. Add Enterprise-only quest types in `lib/utils/questSystem.ts`
2. Lock lead-based quests behind `plan === 'enterprise'`
3. Add real-time UI to show quest progress from events

---

## Troubleshooting

### Error: "relation quest_events does not exist"
- Run the migration SQL again
- Check you're in the correct Supabase project

### Error: "permission denied"
- Make sure you're logged in as Supabase admin
- RLS policies should allow authenticated users automatically

### Error: "violates check constraint"
- Confirm event_type is one of the allowed values
- Confirm source is one of: jobs, inventory, financial, leads, ai, system

### Event not appearing in table
- Check Supabase → Logs → Database to see exact error
- Verify org_id is correct (can be NULL for tests)
- Verify user is authenticated (or org_id is set)

---

## API Reference

### Log a Quest Event

```typescript
import { logQuestEvent } from '@/lib/utils/questEvents';

await logQuestEvent(
  'lead_reachout_sent',  // event_type
  'lead',                 // entity_type
  'lead-id-123',          // entity_id
  {
    metricValue: 1,       // count-based: 1, sum-based: amount
    source: 'leads',      // which module triggered this
    metadata: {           // extra context
      subject: 'Follow up',
      old_status: 'uncontacted',
      new_status: 'contacted',
    },
  }
);
```

### Count Events This Quarter

```typescript
import { countEventsByType } from '@/lib/utils/questEvents';

const reachoutCount = await countEventsByType(
  'lead_reachout_sent',
  'quarterly'
);
```

### Calculate Quest Progress

```typescript
import { calculateProgressFromEvents } from '@/lib/utils/questEvents';

// Count-based: "Send 20 reachouts"
const progress = await calculateProgressFromEvents(
  'lead_reachout_sent',
  20,
  'weekly',
  'count'
);

// Sum-based: "Generate $5000 revenue"
const revenueProgress = await calculateProgressFromEvents(
  'job_revenue_tracked',
  5000,
  'monthly',
  'sum'
);
```
