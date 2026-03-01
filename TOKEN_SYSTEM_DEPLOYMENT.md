# AI Token System - Setup & Deployment Guide

## Prerequisites

✅ Supabase project with database access
✅ Current quest system already deployed (migrations/003_create_quests.sql)
✅ Next.js application running with Supabase client configured
✅ User authenticated in FinancialGoalsClient.tsx

## Step 1: Deploy Database Migration

### In Supabase Dashboard:

1. Navigate to **SQL Editor**
2. Click **New Query**
3. Copy-paste the contents of `migrations/004_create_ai_tokens.sql`
4. Click **Run**
5. Verify tables created:
   - `ai_tokens` (5 records per org - one per token_type)
   - `ai_token_usage_log` (0 records initially)

### Verify Migration:

```sql
-- Check ai_tokens table
SELECT * FROM ai_tokens LIMIT 1;
-- Should return: empty initially (no orgs initialized yet)

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('ai_tokens', 'ai_token_usage_log');
-- Should return: 4 policies total
```

## Step 2: Initialize Tokens for Existing Organizations

### Option A: Manual SQL (Development)

```sql
-- Find test organization
SELECT id, plan FROM organizations WHERE name = 'Your Org' LIMIT 1;
-- Copy the id (org_uuid)

-- Initialize tokens for Pro plan
INSERT INTO ai_tokens (organization_id, token_type, balance, total_allocated, refresh_date)
VALUES 
  ('org_uuid', 'lead_generation', 50, 50, now() + interval '30 days'),
  ('org_uuid', 'goal_generation', 20, 20, now() + interval '30 days'),
  ('org_uuid', 'strategy_analysis', 100, 100, now() + interval '30 days'),
  ('org_uuid', 'forecast', 30, 30, now() + interval '30 days'),
  ('org_uuid', 'general', 50, 50, now() + interval '30 days');
```

### Option B: API Call (Production)

```typescript
// From your app code
import { initializeTokens } from '@/lib/utils/aiTokens';

const success = await initializeTokens('org-uuid', 'pro');
console.log(success ? '✅ Tokens initialized' : '❌ Failed');
```

## Step 3: Verify Token System in App

### Check 1: Component Imports
In `app/app/warehouse/financial/goals/FinancialGoalsClient.tsx`:

```typescript
// ✅ Should see this import inside onQuestGenerate:
const { deductTokens, hasEnoughTokens } = await import('@/lib/utils/aiTokens');
```

### Check 2: Token Display Component
In your dashboard, add TokenDashboard:

```tsx
import TokenDashboard from '@/components/TokenDashboard';

// In your render:
<TokenDashboard
  organizationId={organizationId}
  plan={organizationPlan}
/>
```

### Check 3: Test Quest Generation with Tokens

1. Navigate to Financial Goals page
2. Go to **Quests** tab
3. Click **Generate New Quest** button
4. Should see:
   - ✅ For Pro/Enterprise: Quest generated, tokens deducted
   - ❌ For Starter: Alert "Not available on Starter plan"
   - ❌ If out of tokens: Alert "You're out of AI tokens"

## Step 4: Test Endpoints

### Test Token Check Endpoint

```bash
curl -X POST http://localhost:3000/api/v1/tokens/check-balance \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "your-org-uuid",
    "featureUsed": "generate_goal",
    "action": "check"
  }'

# Expected response:
# { "hasTokens": true }
```

### Test Token Deduction Endpoint

```bash
curl -X POST http://localhost:3000/api/v1/tokens/check-balance \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "your-org-uuid",
    "featureUsed": "generate_goal",
    "action": "deduct"
  }'

# Expected response:
# {
#   "success": true,
#   "remainingBalance": 17,
#   "message": "Used 3 tokens for generate_goal"
# }
```

### Test Token Stats Endpoint

```bash
curl http://localhost:3000/api/v1/tokens/stats?organizationId=your-org-uuid

# Expected response:
# {
#   "totalBalance": 150,
#   "totalAllocated": 200,
#   "totalUsed": 50,
#   "byType": [...]
# }
```

## Step 5: Monitor Token Usage

### View Usage Log in Supabase

```sql
-- See all token deductions
SELECT * FROM ai_token_usage_log 
ORDER BY created_at DESC 
LIMIT 20;

-- See usage by feature
SELECT 
  feature_used, 
  COUNT(*) as uses,
  SUM(tokens_deducted) as total_tokens
FROM ai_token_usage_log
GROUP BY feature_used;

-- See per-user usage
SELECT 
  up.full_name,
  COUNT(*) as api_calls,
  SUM(atul.tokens_deducted) as tokens_used
FROM ai_token_usage_log atul
JOIN user_profiles up ON atul.user_id = up.id
GROUP BY up.full_name
ORDER BY tokens_used DESC;
```

## Step 6: Integration Checklist

### UI Integration
- [ ] TokenDashboard component added to dashboard
- [ ] Quest generation shows token feedback
- [ ] Upgrade prompts in place for Starter
- [ ] Low token warnings display (< 20%)

### API Integration
- [ ] Quest generation checks `hasEnoughTokens()`
- [ ] Quest generation deducts via `deductTokens()`
- [ ] Lead generation (if exists) integrated
- [ ] Revenue forecast (if exists) integrated
- [ ] Notifications display remaining balance

### Database
- [ ] Migration 004 deployed
- [ ] Test organization has tokens initialized
- [ ] RLS policies verified in Supabase
- [ ] Test deductions logged to ai_token_usage_log

### Monitoring
- [ ] Usage logs viewable in Supabase
- [ ] Stats endpoint working
- [ ] Tokens properly reset monthly
- [ ] Plan upgrades initialize correct limits

## Common Issues & Fixes

### Issue: "Insufficient tokens" Error on Pro Plan
**Cause**: Tokens not initialized for organization
**Fix**: 
```sql
-- Manually initialize
INSERT INTO ai_tokens (organization_id, token_type, balance, total_allocated, refresh_date)
VALUES ('org-id', 'goal_generation', 20, 20, now() + interval '30 days');
```

### Issue: Token Balance Always Shows 0
**Cause**: RLS policies blocking access
**Fix**: 
1. Verify user_profiles has correct organization_id
2. Check RLS policies grant access:
```sql
SELECT * FROM pg_policies WHERE tablename = 'ai_tokens';
```

### Issue: "Unauthorized" on Stats Endpoint
**Cause**: User not authenticated or wrong org
**Fix**:
1. Ensure user is logged in
2. Verify organizationId matches user's organization in user_profiles

### Issue: Tokens Deducted But Not Logged
**Cause**: INSERT into ai_token_usage_log failed silently
**Fix**: Check RLS policies on usage log table

## Performance Tuning

### Add Indexes (if not in migration)
```sql
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_org_date 
ON ai_token_usage_log(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_tokens_refresh
ON ai_tokens(refresh_date) WHERE refresh_date IS NOT NULL;
```

### Monitor Query Performance
```sql
-- Slow query: all token ops for org (should be < 10ms)
EXPLAIN ANALYZE
SELECT * FROM ai_tokens WHERE organization_id = 'org-id';

-- Slow query: recent usage (should be < 50ms even with 10k rows)
EXPLAIN ANALYZE
SELECT * FROM ai_token_usage_log 
WHERE organization_id = 'org-id' 
AND created_at > now() - interval '30 days'
LIMIT 100;
```

## Production Checklist

- [ ] All organizations initialized with correct tier limits
- [ ] Token limits match pricing page
- [ ] Daily refresh job configured (if using scheduled tasks)
- [ ] Error logging configured for token failures
- [ ] Monitoring alerts set up for:
  - High usage patterns (> 80% monthly)
  - Failed deductions (RLS violations)
  - Refresh failures
- [ ] Backups include ai_tokens and ai_token_usage_log
- [ ] Documentation shared with support team
- [ ] Stripe webhook updates organization.plan on upgrade
- [ ] initializeTokens() called when plan changes

## Rate Limiting (Future)

To prevent abuse, add rate limiting per user:

```typescript
// Check if user has used tokens in last minute
const recentUsage = await getRecentUsageCount(userId, 60); // last 60 seconds
if (recentUsage > 5) {
  throw new Error('Rate limit exceeded. Wait before next request.');
}
```

## Rollback Plan

If issues arise:

1. **Disable Token Checks**: Comment out hasEnoughTokens() checks in FinancialGoalsClient.tsx
2. **Revert to Unlimited**: Set all token_types balance to 9999
3. **Stop Deductions**: Prevent deductTokens() from executing
4. **Restore**: Redeploy migration 004 with fixes

## Next Steps

1. ✅ Deploy migration 004
2. ✅ Initialize tokens for test orgs
3. ✅ Test quest generation with tokens
4. ✅ Monitor usage logs
5. Future: Integrate into lead generation, forecasting, strategy features
6. Future: Add token purchase/refresh UI
7. Future: Create admin panel for token management
