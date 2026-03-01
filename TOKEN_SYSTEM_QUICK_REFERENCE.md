# AI Token System - Quick Reference

## 🚀 Quick Start

### For Developers Integrating Token Checks

```typescript
import { hasEnoughTokens, deductTokens } from '@/lib/utils/aiTokens';

// Before calling an AI feature:
if (!await hasEnoughTokens(organizationId, 'generate_goal')) {
  alert('Insufficient tokens. Upgrade your plan.');
  return;
}

// After successful operation:
await deductTokens(organizationId, userId, 'generate_goal', {
  metadata: 'optional context'
});
```

## Token Types & Costs

| Feature | Token Type | Cost | Use Case |
|---------|-----------|------|----------|
| AI Goal Creation | `generate_goal` | 3 tokens | User generates new quarterly goal |
| AI Lead Discovery | `generate_leads` | 5 tokens | Batch import from AI sources |
| Strategy Analysis | `analyze_strategy` | 2 tokens | AI recommends business strategies |
| Revenue Forecast | `forecast_revenue` | 4 tokens | AI predicts quarterly revenue |
| General Insights | `generate_insight` | 1 token | Any other AI feature |

## Plan Limits (Monthly Allocation)

```
STARTER:  All features = 0 tokens → Blocked
PRO:      50 leads / 20 goals / 100 strategy / 30 forecast
ENTERPRISE: 500+ for all (essentially unlimited)
```

## Functions Reference

### Check Balance
```typescript
const balance = await getTokenBalance(orgId, 'goal_generation');
// Returns: number
```

### Check if User Can Use Feature
```typescript
const canUse = await hasEnoughTokens(orgId, 'generate_goal');
// Returns: boolean (true = has enough tokens)
```

### Get All Balances
```typescript
const balances = await getAllTokenBalances(orgId);
// Returns: { lead_generation: 50, goal_generation: 20, ... }
```

### Deduct Tokens
```typescript
const result = await deductTokens(orgId, userId, 'generate_goal', {
  quarter: 'Q1',
  amount: 75000
});
// Returns: { success, remainingBalance, message }
```

### Get Statistics
```typescript
const stats = await getTokenStats(orgId);
// Returns: { totalBalance, totalUsed, totalAllocated, byType, refreshDate }
```

## API Endpoints

### Check/Deduct Tokens
```bash
# Check if tokens available
POST /api/v1/tokens/check-balance
{ "organizationId": "...", "featureUsed": "generate_goal", "action": "check" }
Response: { "hasTokens": true }

# Deduct tokens (auto-authenticated from session)
POST /api/v1/tokens/check-balance
{ "organizationId": "...", "featureUsed": "generate_goal", "action": "deduct" }
Response: { "success": true, "remainingBalance": 17, "message": "..." }
```

### Get Token Stats
```bash
GET /api/v1/tokens/stats?organizationId=...
Response: { "totalBalance": 150, "totalUsed": 50, "byType": [...] }
```

## UI Components

### Token Dashboard
```tsx
import TokenDashboard from '@/components/TokenDashboard';

<TokenDashboard
  organizationId={orgId}
  plan="pro"
  onLoadingChange={(loading) => console.log(loading)}
/>
```

Shows:
- Current balance for each token type
- Usage percentage with color-coded bar
- Days until refresh
- Low balance warnings

## Integration Pattern

```typescript
// Step 1: Permission gate
if (organizationPlan === 'starter') {
  showError('Feature not available on Starter');
  return;
}

// Step 2: Token check
if (!await hasEnoughTokens(orgId, 'generate_goal')) {
  showError('Out of tokens. Upgrade or wait for refresh.');
  return;
}

// Step 3: Perform AI operation
const result = await generateGoalWithAI(...);

// Step 4: Deduct tokens
await deductTokens(orgId, userId, 'generate_goal', { goal: result });

// Step 5: Notify user
showSuccess(`Goal created! ${remainingBalance} tokens left`);
```

## Configuration

### Set Token Limits (in aiTokens.ts)
```typescript
export const TOKEN_LIMITS = {
  starter: { all: 0 },
  pro: {
    lead_generation: 50,
    goal_generation: 20,
    strategy_analysis: 100,
    forecast: 30,
    general: 50,
  },
  enterprise: { ... }
};
```

### Set Token Costs (in aiTokens.ts)
```typescript
export const TOKEN_COSTS = {
  'generate_leads': 5,
  'generate_goal': 3,
  'analyze_strategy': 2,
  'forecast_revenue': 4,
  // ... add more
};
```

## Error Codes

| Scenario | Response |
|----------|----------|
| User is Starter | 403 - Feature not available |
| Out of tokens | `{ success: false, remainingBalance: 0 }` |
| Invalid token type | Token deduction fails, logged |
| RLS violation | 403 - Forbidden |
| No auth session | 401 - Unauthorized |
| Bad request format | 400 - Missing fields |

## Testing

### Manual Test Flow
1. Go to Financial Goals → Quests tab
2. Click "Generate New Quest" button
3. Should check tokens before creating
4. Watch console for `✅ Deducted X tokens`
5. See notification with remaining balance
6. Go to dashboard card → TokenDashboard shows updated balance

### Test Different Plans
```sql
-- Set org to Starter
UPDATE organizations SET plan = 'starter' WHERE id = 'org-id';

-- Should block quest generation now

-- Set to Pro
UPDATE organizations SET plan = 'pro' WHERE id = 'org-id';

-- Should allow quest generation and deduct 3 tokens
```

### Check Usage Logs
```sql
-- See all deductions
SELECT * FROM ai_token_usage_log ORDER BY created_at DESC;

-- By feature
SELECT feature_used, COUNT(*), SUM(tokens_deducted) 
FROM ai_token_usage_log GROUP BY feature_used;
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "Insufficient tokens" on Pro | Tokens not initialized | Initialize in DB |
| API returns 403 | Wrong org or not authenticated | Check user session & org |
| Balance stays 0 | Failed initialization | Re-initialize tokens |
| Deduction fails silently | RLS policy issue | Check ai_tokens RLS |
| UI shows old balance | Cache not refreshed | Click refresh button |

## Files to Know

| File | Purpose |
|------|---------|
| `lib/utils/aiTokens.ts` | Core token operations |
| `components/TokenDashboard.tsx` | UI display component |
| `app/api/v1/tokens/*` | REST API endpoints |
| `migrations/004_create_ai_tokens.sql` | Database schema |
| `AI_TOKEN_SYSTEM_GUIDE.md` | Full documentation |
| `TOKEN_SYSTEM_DEPLOYMENT.md` | Setup guide |

## Tier Comparison

```
                STARTER    PRO        ENTERPRISE
Lead Gen        0/month    50/month   500/month
Goal Gen        0/month    20/month   200/month  
Strategy        0/month    100/month  1000/month
Forecast        0/month    30/month   200/month
Claim Rewards   ✅         ✅         ✅
View Quests     ✅         ✅         ✅
Price           Free       $X/mo      $Y/mo
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Token system uses these automatically via supabase client.

## SQL Queries You'll Need

```sql
-- Initialize new org
INSERT INTO ai_tokens (organization_id, token_type, balance, total_allocated, refresh_date)
VALUES ('org-id', 'goal_generation', 20, 20, now() + interval '30 days');

-- See token balance  
SELECT token_type, balance FROM ai_tokens WHERE organization_id = 'org-id';

-- Check usage today
SELECT feature_used, COUNT(*), SUM(tokens_deducted)
FROM ai_token_usage_log
WHERE organization_id = 'org-id' AND created_at::date = CURRENT_DATE
GROUP BY feature_used;

-- Manually add tokens
UPDATE ai_tokens SET balance = balance + 10 
WHERE organization_id = 'org-id' AND token_type = 'goal_generation';
```

## Next Steps After Deploy

1. ✅ Run migration 004
2. ✅ Initialize tokens for test orgs
3. ✅ Test quest generation flow
4. ✅ Monitor ai_token_usage_log
5. ⏭️ Integrate into lead generation
6. ⏭️ Integrate into revenue forecast
7. ⏭️ Create admin token management UI
8. ⏭️ Add token purchase flow
9. ⏭️ Connect Stripe webhooks

## Performance Tips

- Token checks are sub-10ms (indexed queries)
- Batch token operations if processing many items
- Cache token balance in UI for 30 seconds
- Use getAllTokenBalances() to get all at once
- Index ai_token_usage_log by organization_id & created_at

## Troubleshooting Guide

### "Sufficient tokens but still getting blocked"
```typescript
// Debug: Log actual balance
const balance = await getTokenBalance(orgId, 'goal_generation');
const cost = TOKEN_COSTS['generate_goal'];
console.log(`Balance: ${balance}, Cost: ${cost}, Has enough: ${balance >= cost}`);
```

### "Tokens deducted but not showing in usage log"
```sql
-- Check RLS policy on usage_log table
SELECT * FROM pg_policies WHERE tablename = 'ai_token_usage_log';
-- Should have INSERT policy for system
```

### "User can't see their tokens"
```sql
-- Verify user in correct org
SELECT * FROM user_profiles WHERE id = 'user-id';
-- Verify org has tokens
SELECT * FROM ai_tokens WHERE organization_id = 'org-id';
```

## Glossary

- **Token**: Unit of credit for AI feature usage
- **Token Type**: Category (goal_generation, lead_generation, etc.)
- **Balance**: Current available tokens
- **Total Allocated**: Tokens granted this period
- **Total Used**: Tokens consumed this period
- **Refresh Date**: When balance resets to allocated
- **Cost**: Tokens required for a feature

---

**Last Updated**: December 2024  
**Status**: ✅ Ready for deployment
