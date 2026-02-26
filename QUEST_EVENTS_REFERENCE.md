# Quest Events System - Quick Reference

## The Core Idea

Every important action in the app fires an **event** to the `quest_events` table:
- Lead reaches out → `lead_reachout_sent` event
- Job completes → `job_completed` event
- Meeting scheduled → `lead_meeting_booked` event

Any **quest can consume these events** to measure progress:
- "Send 20 leads a follow-up email" → Count `lead_reachout_sent` events
- "Generate $5000 in revenue" → Sum `job_revenue_tracked` events
- "Acquire 5 new customers" → Count `new_client_this_quarter` events

This enables **infinite quest types** without modifying code.

---

## Event Types (10 total)

| Event Type | Source | Trigger | Value |
|---|---|---|---|
| `lead_reachout_sent` | leads | Sent follow-up email | 1 |
| `lead_status_updated` | leads | Lead status changed | 1 |
| `lead_meeting_booked` | leads | Meeting scheduled | 1 |
| `lead_converted_to_client` | leads | Status → 'converted' | 1 |
| `job_completed` | jobs | Job marked done | 1 |
| `job_revenue_tracked` | financial | Job payment received | actual amount |
| `new_client_this_quarter` | jobs | First-time customer | 1 |
| `inventory_deployed` | inventory | Equipment sent out | 1 |
| `maintenance_completed` | inventory | Preventive service done | 1 |
| `custom_event` | system | User-defined event | custom |

---

## Event Sources (6 total)

For organizing by what triggered the event:

- `leads` - Lead module actions (Enterprise feature)
- `jobs` - Job/Customer module actions
- `inventory` - Equipment/Inventory module actions
- `financial` - Revenue/Payment tracking
- `ai` - AI-triggered actions (forecasting, alerts)
- `system` - Manual tests, admin actions

---

## Metric Value Semantics

**Count-based quests** (how many times?):
- Event: `metricValue: 1` (one action happened)
- Quest: "Send 20 emails" = count if `metricValue >= 20`

**Sum-based quests** (how much total?):
- Event: `metricValue: 5000` (actual amount)
- Quest: "Generate $5000 revenue" = sum if `total >= $5000`

---

## Key Functions

### Log an Event
```typescript
await logQuestEvent(
  eventType: 'lead_reachout_sent',
  entityType: 'lead',
  entityId: 'lead-123',
  { metricValue: 1, source: 'leads', metadata: {...} }
);
```

### Count Events
```typescript
const count = await countEventsByType(
  'lead_reachout_sent',
  'quarterly'  // weekly|monthly|quarterly|all_time
);
```

### Sum Event Values
```typescript
const revenue = await sumEventMetrics(
  'job_revenue_tracked',
  'monthly'
);
```

### Calculate Progress (0-100)
```typescript
const progress = await calculateProgressFromEvents(
  'lead_reachout_sent',
  20,        // goal: 20 reachouts
  'weekly',
  'count'    // count|sum
);
// Returns: 65 (if 13 events logged out of 20)
```

### Get Events for Audit Trail
```typescript
const events = await getEventsForEntity('lead', 'lead-123');
// Returns: All events ever logged for this lead
```

---

## Integration Points

### Leads Module

**File: `app/app/dashboard/leads/page.tsx`**
- `handleSendFollowUpEmail()` → fires `lead_reachout_sent` + `lead_status_updated`
- `handleScheduleMeeting()` → fires `lead_meeting_booked`

**File: `app/app/dashboard/leads/pipeline/page.tsx`**
- `handleDrop()` → fires `lead_status_updated` on any drag
- Drag to 'converted' → fires `lead_converted_to_client`

### Jobs Module
- (Ready to add) Job completion → fires `job_completed`
- (Ready to add) Payment received → fires `job_revenue_tracked`

### Inventory Module
- (Ready to add) Equipment deployed → fires `inventory_deployed`
- (Ready to add) Maintenance done → fires `maintenance_completed`

---

## Database Schema

```sql
quest_events (
  id uuid PRIMARY KEY,
  event_type enum (10 allowed values),
  entity_type text,           -- 'lead', 'job', 'equipment', etc
  entity_id text,            -- references specific record
  metric_value numeric,      -- 1 (count) or amount (sum)
  source enum (6 allowed),   -- which module triggered
  metadata jsonb,            -- extra context (user_id, old_status, etc)
  org_id uuid,               -- which organization
  created_by uuid,           -- which user
  created_at timestamp
);

Indexes:
- event_type fast lookups
- (entity_type, entity_id) for audit trails
- source for module analytics
- created_at for time windows
- (org_id, created_at) for org-scoped queries
```

---

## Deployment Checklist

- [ ] Run migration: `001_create_quest_events.sql`
- [ ] Verify table exists in Supabase
- [ ] POST to `/api/test/event-logging` to log test event
- [ ] Verify event appears in Supabase table
- [ ] Send test lead reachout → verify `lead_reachout_sent` event
- [ ] Check questSystem.ts calls `calculateProgressFromEvents`
- [ ] Confirm Enterprise quests hidden on Pro plan

---

## Next Steps

**Phase 1 (Current):**
- ✅ Infrastructure built
- ⏳ Database migration
- ⏳ API test
- ⏳ E2E validation

**Phase 2 (Tier Gating):**
- [ ] Add `plan === 'enterprise'` check to lead-based quests
- [ ] Lock enterprise quests behind license verification
- [ ] Add UI indicator for locked quests

**Phase 3 (Real-time UI):**
- [ ] WebSocket connection for live progress updates
- [ ] Event animations when progress increments
- [ ] Notifications on quest completion

**Phase 4 (Analytics):**
- [ ] Event volume dashboard
- [ ] Module breakdown (which source drives most progress?)
- [ ] Tier comparison metrics

---

## FAQ

**Q: Why events instead of calling quest calculation directly?**
A: Events are fire-and-forget. Code doesn't wait for quest update. Decouples Leads module from quest system. Enables future AI to consume same events.

**Q: What if I want a custom metric (not pre-defined)?**
A: Use `custom_event` type + metadata field. Example:
```json
{
  "event_type": "custom_event",
  "metadata": {
    "quest_id": "custom-123",
    "metric_name": "customer_satisfaction_score",
    "value": 8.5
  }
}
```

**Q: When does quest progress update?**
A: Three ways:
1. Manual: Call `calculateQuestProgress()` explicitly
2. Scheduled: Cron job runs every 5 minutes
3. Real-time: WebSocket (Phase 3)

**Q: Why do leads require Enterprise?**
A: Lead tracking is premium. Pro tier gets jobs + revenue. Enterprise gets jobs + leads + inventory.

**Q: Can I query events by user?**
A: Yes: Metadata includes `created_by` UUID. But for privacy, only enterprise users can see other team members' lead data.

---

## Useful SQL Queries

**All events this quarter:**
```sql
SELECT * FROM quest_events 
WHERE created_at >= date_trunc('quarter', now());
```

**Events by type:**
```sql
SELECT event_type, COUNT(*) as count FROM quest_events 
GROUP BY event_type;
```

**Revenue tracked (sum):**
```sql
SELECT SUM(metric_value) as total_revenue FROM quest_events 
WHERE event_type = 'job_revenue_tracked' 
AND created_at >= date_trunc('month', now());
```

**Lead reachouts this week:**
```sql
SELECT COUNT(*) FROM quest_events 
WHERE event_type IN ('lead_reachout_sent', 'lead_meeting_booked') 
AND created_at >= now() - interval '7 days';
```

**Audit trail for specific lead:**
```sql
SELECT * FROM quest_events 
WHERE entity_type = 'lead' AND entity_id = 'lead-123' 
ORDER BY created_at DESC;
```
