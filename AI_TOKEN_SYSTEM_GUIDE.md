# AI Token System Documentation

## Overview

The AI Token system provides resource management and billing for AI-powered features in Bright Audio. It enforces tier-based usage limits to support subscription monetization and prevent resource abuse.

## Token Tiers

### Starter (Free)
- **Lead Generation**: 0 tokens
- **Goal Generation**: 0 tokens
- **Strategy Analysis**: 0 tokens
- **Revenue Forecast**: 0 tokens
- **Status**: No AI features available

### Pro
- **Lead Generation**: 50/month (5 tokens per batch)
- **Goal Generation**: 20/month (3 tokens per call)
- **Strategy Analysis**: 100/month (2 tokens per analysis)
- **Revenue Forecast**: 30/month (4 tokens per forecast)
- **Total**: ~200 tokens/month across all features

### Enterprise
- **Lead Generation**: 500/month (unlimited essentially)
- **Goal Generation**: 200/month
- **Strategy Analysis**: 1000/month
- **Revenue Forecast**: 200/month
- **Total**: ~1900 tokens/month - true unlimited usage

## Token Costs

Each AI feature has a specific token cost:

```typescript
const TOKEN_COSTS = {
  'generate_leads': 5,        // Lead generation batch
  'generate_goal': 3,         // Goal creation through AI
  'analyze_strategy': 2,      // Strategic analysis
  'forecast_revenue': 4,      // Revenue forecasting
  'analyze_efficiency': 2,    // Efficiency analysis
  'generate_insight': 1,      // General insights
};
```

## Database Schema

### ai_tokens Table
Tracks current and historical token balances per organization and feature type:

```sql
CREATE TABLE ai_tokens (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  token_type TEXT NOT NULL, -- lead_generation, goal_generation, strategy_analysis, forecast, general
  balance INTEGER NOT NULL DEFAULT 0,
  total_allocated INTEGER NOT NULL DEFAULT 0,
  total_used INTEGER NOT NULL DEFAULT 0,
  refresh_date TIMESTAMP,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(organization_id, token_type)
);
```

### ai_token_usage_log Table
Audit trail for compliance and usage analytics:

```sql
CREATE TABLE ai_token_usage_log (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  token_type TEXT NOT NULL,
  feature_used TEXT NOT NULL,
  tokens_deducted INTEGER NOT NULL,
  remaining_balance INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP
);
```

## API Functions

### `initializeTokens(organizationId, plan)`
Initialize tokens when organization is created or plan changes.

```typescript
const success = await initializeTokens('org-123', 'pro');
```

### `getTokenBalance(organizationId, tokenType)`
Get current balance for a specific token type.

```typescript
const balance = await getTokenBalance('org-123', 'lead_generation');
// Returns: number (current balance)
```

### `getAllTokenBalances(organizationId)`
Get all token balances for organization.

```typescript
const balances = await getAllTokenBalances('org-123');
// Returns: { lead_generation: 50, goal_generation: 20, ... }
```

### `hasEnoughTokens(organizationId, featureUsed)`
Check if organization can use a feature (before attempting to deduct).

```typescript
const canUse = await hasEnoughTokens('org-123', 'generate_goal');
// Returns: boolean
```

### `deductTokens(organizationId, userId, featureUsed, metadata?)`
Deduct tokens and log usage. Returns detailed result with remaining balance.

```typescript
const result = await deductTokens(
  'org-123',
  'user-456',
  'generate_goal',
  { quarter: 'Q1', target: 75000 }
);
// Returns: {
//   success: boolean,
//   remainingBalance: number,
//   message: string
// }
```

### `getTokenStats(organizationId)`
Get comprehensive statistics for organization.

```typescript
const stats = await getTokenStats('org-123');
// Returns: {
//   totalBalance: number,
//   totalAllocated: number,
//   totalUsed: number,
//   byType: Array<TokenRecord>,
//   refreshDate: string
// }
```

### `upgradeTokens(organizationId, tokenType, additionalTokens)`
Add tokens to organization (admin only - called during plan upgrade).

```typescript
const success = await upgradeTokens('org-123', 'goal_generation', 50);
```

## Integration Points

### Quest Generation
When a user generates an AI goal/quest:

```typescript
// 1. Check balance first
const hasTokens = await hasEnoughTokens(organizationId, 'generate_goal');
if (!hasTokens) {
  showUpgradePrompt(); // Starter? Show plan comparison. Pro? Show refill info.
  return;
}

// 2. Generate quest
const quest = generateQuestLine(...);

// 3. Save to database
await saveQuest(quest);

// 4. Deduct tokens
const result = await deductTokens(organizationId, userId, 'generate_goal');

// 5. Show notification with remaining balance
showNotification(`Quest created. ${result.remainingBalance} tokens remaining.`);
```

### Lead Generation
Similar pattern for lead discovery features:

```typescript
if (!await hasEnoughTokens(orgId, 'generate_leads')) {
  alert('Upgrade to Pro for AI lead generation');
  return;
}
// ... generate leads ...
await deductTokens(orgId, userId, 'generate_leads');
```

### Revenue Forecasting
```typescript
if (!await hasEnoughTokens(orgId, 'forecast_revenue')) {
  alert('Token limit reached');
  return;
}
// ... forecast ...
await deductTokens(orgId, userId, 'forecast_revenue');
```

## REST API Endpoints

### Check Token Balance
**POST** `/api/v1/tokens/check-balance`

Request:
```json
{
  "organizationId": "org-123",
  "featureUsed": "generate_goal",
  "action": "check"
}
```

Response:
```json
{
  "hasTokens": true
}
```

### Deduct Tokens via API
**POST** `/api/v1/tokens/check-balance`

Request:
```json
{
  "organizationId": "org-123",
  "featureUsed": "generate_goal",
  "action": "deduct"
}
```

Response:
```json
{
  "success": true,
  "remainingBalance": 17,
  "message": "Used 3 tokens for generate_goal"
}
```

### Get Token Statistics
**GET** `/api/v1/tokens/stats?organizationId=org-123`

Response:
```json
{
  "totalBalance": 150,
  "totalAllocated": 200,
  "totalUsed": 50,
  "refreshDate": "2024-02-15T10:30:00Z",
  "byType": [
    {
      "token_type": "lead_generation",
      "balance": 50,
      "total_allocated": 50,
      "total_used": 0
    },
    {
      "token_type": "goal_generation",
      "balance": 17,
      "total_allocated": 20,
      "total_used": 3
    }
    // ... more types
  ]
}
```

## UI Components

### TokenDashboard Component
Display token usage across all features with visual progress bars.

```tsx
import TokenDashboard from '@/components/TokenDashboard';

<TokenDashboard
  organizationId={orgId}
  plan={userPlan}
/>
```

**Features:**
- Shows current balance vs allocated for each token type
- Displays percentage usage with color-coded bars
- Shows refresh date and days remaining
- Highlights when tokens are low (< 20% remaining)
- One-click refresh button
- Plan upgrade CTA for Starter users

## Monthly Token Refresh

Tokens refresh on a monthly basis:

1. **Scheduled Job** (runs daily at 00:00 UTC):
   - Check for organizations with refresh_date <= today
   - Reset balance = total_allocated for each token type
   - Update refresh_date to 30 days from now
   - Log the refresh event

2. **Proactive Check** (on app load):
   - If refresh_date is in the past, trigger manual refresh
   - Ensures users always see up-to-date balances

## Error Handling

### Insufficient Tokens
```
❌ Error: "Insufficient tokens. Need 3, have 1"
User Action: Show upgrade prompt or inform of monthly reset
```

### Unauthorized Access
```
❌ Error: "Forbidden - no access to this organization"
User Action: Verify authentication and organization membership
```

### Database Failures
```
❌ Error: "Failed to deduct tokens"
User Action: Log incident, inform user, retry or rollback
```

## Billing Integration

When a user upgrades their plan:

```typescript
// 1. Update organization.plan
await updatePlan(orgId, newPlan);

// 2. Initialize new token limits
const limits = TOKEN_LIMITS[newPlan];
for (const tokenType in limits) {
  await upgradeTokens(orgId, tokenType, limits[tokenType]);
}

// 3. Emit event for billing system
emit('plan.upgraded', { orgId, newPlan, timestamp });
```

## Monitoring & Analytics

### Usage Queries
```sql
-- Top features by usage
SELECT feature_used, COUNT(*) as usage_count, SUM(tokens_deducted) as total_tokens
FROM ai_token_usage_log
WHERE created_at > now() - interval '30 days'
GROUP BY feature_used
ORDER BY total_tokens DESC;

-- Per-organization usage
SELECT organization_id, SUM(tokens_deducted) as total_used
FROM ai_token_usage_log
WHERE created_at > now() - interval '30 days'
GROUP BY organization_id;

-- User contribution to usage
SELECT user_id, COUNT(*) as feature_calls, SUM(tokens_deducted) as tokens_used
FROM ai_token_usage_log
GROUP BY user_id
ORDER BY tokens_used DESC;
```

## Future Enhancements

1. **Dynamic Token Costs**: Adjust costs based on complexity (simple vs complex forecasts)
2. **Token Marketplace**: Allow users to purchase additional tokens on-demand
3. **Usage Forecasting**: Predict when users will run out of tokens
4. **Bulk Operations**: Discount for multi-feature operations (run goal + forecast = -1 token)
5. **Team Quotas**: Allocate separate token pools per team/department
6. **Token Gifting**: Allow admins to gift tokens to specific users

## Troubleshooting

### Tokens Not Deducting
- Check that token type matches TOKEN_TYPES enum
- Verify organization_id is valid and user has access
- Check for RLS policy violations in logs
- Ensure ai_token_usage_log insert isn't failing silently

### Balance Shows 0 Unexpectedly
- Confirm refresh_date hasn't passed (run refresh if needed)
- Verify organization exists in ai_tokens table
- Check for failed batch operations

### API Returns 403 Forbidden
- Authenticate user first (check session)
- Verify organization_id matches user's actual organization
- Check RLS policies on ai_tokens and ai_token_usage_log tables
