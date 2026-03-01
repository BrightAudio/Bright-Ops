# 💰 AI Token System - Business Rules & SaaS Architecture

## 5 Strategic Business Decisions (Now Enforced)

### 1️⃣ Token Additive Behavior ✅
**Policy: No Rollover, Hard Caps, Optional Purchases**

```typescript
// In tokenBusinessRules.ts
TOKEN_POLICY = {
  rollover: false,           // Unused tokens don't carry over
  hardCapPerTier: true,      // Each tier has fixed limit
  allowTokenPurchase: true,  // Users can buy +500 or +2000 tokens
  enterpriseHasCap: true,    // Even Enterprise capped at 2000/month (not infinite)
}
```

**Why This Matters:**
- Clean accounting (no mystery token hoarding)
- Predictable costs (don't over-allocate)
- Revenue lever (token purchases = pure margin)
- User behavior incentive (use it or lose it ≠ waste)

---

### 2️⃣ Token Exhaustion Behavior ✅
**Policy: Hard Block + Upgrade Modal**

```typescript
EXHAUSTION_BEHAVIOR = {
  hardBlockAt0: true,           // Immediately block at 0
  graceUses: 0,                 // No grace uses
  showUpgradeModal: true,       // Show purchase/upgrade options
  errorMessage: "You've reached your limit. Upgrade or purchase credits.",
  purchaseLink: '/account/buy-credits',
}
```

**User Experience Flow:**
1. User has 0 tokens
2. Clicks "Generate Goal"
3. Hard block: "You've used all your tokens"
4. Modal shows 2 upgrade paths:
   - "Upgrade to Enterprise ($399/mo)"
   - "Buy 500 tokens ($29)" ← Pure margin
5. User sees remaining credits after exhaustion

**Revenue Impact:**
- Starter users upgrade or leave (good funnel metric)
- Pro users often buy +500 tokens ($29) instead of upgrading ($399)
- Enterprise users have high limit but still see "Buy more" option

---

### 3️⃣ Abuse Prevention ✅
**Policy: Multi-Layer Rate Limiting + Fraud Detection**

```typescript
ABUSE_PREVENTION = {
  maxTokensPerRequest: 10,              // Prevent 100-token bomb
  maxRequestsPerMinute: 30,             // Rate limit per user
  maxOutputTokens: 2000,                // Max AI response size
  minSecondsBetweenRequests: 3,         // Frequency throttle
  fraudThresholds: {
    tokensPerHourAlert: 500,            // Alert if > $5/hour burn
    failedAttemptsBeforeBlock: 5,       // Block after 5 failures
  }
}
```

**Layers:**
1. **Rate Limiting** - Max 30 requests/minute/user (ChatGPT-like)
2. **Frequency** - Min 3 seconds between requests
3. **Size Limits** - Single request can't burn > 10 tokens
4. **Output Validation** - AI response capped at 2000 tokens
5. **Fraud Detection** - Alert if > 500 tokens/hour (suspicious pattern)
6. **Failed Attempt Blocking** - Block after 5 invalid requests

**Implementation:**
```typescript
// Run before ANY token deduction
const abuseCheck = await runAbuseCheckBattery(userId, orgId, tokensRequested);
if (!abuseCheck.allowed) {
  return { error: abuseCheck.reason };
}
```

---

### 4️⃣ Pricing Alignment ✅
**Policy: Margin-Protected Tiers**

```typescript
PRICING_ALIGNMENT = {
  costPerTokenCents: 1,  // Your cost to OpenAI: $0.01/token average
  
  tierPricing: {
    starter: {
      price: $0,
      tokens: 0,
      margin: $0 (no margin, no cost)
    },
    pro: {
      price: $149/month,
      tokens: 200,
      yourCost: $2.00,
      margin: $147.00 (98.6% margin!)
    },
    enterprise: {
      price: $399/month,
      tokens: 2000,
      yourCost: $20.00,
      margin: $379.00 (94.9% margin)
    }
  }
}
```

**Token Purchase Revenue (PURE MARGIN):**
- $29 for +500 tokens = $24.65 gross margin (85%)
- $79 for +2000 tokens = $67.15 gross margin (85%)

**Why This Structure Works:**
- Pro users at $149 get $2 of AI cost → $147/month recurring
- Pro users buy tokens $29/month → $300/year extra
- Enterprise users at $399 get $20 of AI cost → $379/month recurring
- Token purchase becomes secondary revenue stream

**Margin Health Check** (run monthly):
```
Pro tier margin = $147 ✅ (healthy > $100)
Enterprise margin = $379 ✅ (healthy > $300)
If margin drops → increase price or reduce token allocation
```

---

### 5️⃣ License + Token Synergy ✅
**Policy: AI Degrades FIRST on Payment Failure**

```typescript
LICENSE_TOKEN_SYNERGY = {
  degradationOrder: [
    'ai_features',    // Disable AI first (tokens become useless)
    'sync_engine',    // Then sync
    'reports',        // Then reporting
  ],
  
  gracePeriodDays: 14,  // 14 days to fix payment before full disable
  
  onPaymentFailed: {
    disableAIImmediately: true,       // AI off same day as failed payment
    refundUnusedTokens: true,         // Return token tokens
    showWarningBanner: true,
  }
}
```

**Timeline (Payment Failed):**
```
Day 0 (Payment fails)
  ↓
  → AI features disabled immediately
  → Unused tokens refunded to account
  → Warning banner: "Update payment to restore AI"
  
Days 1-14 (Grace period)
  ↓
  → User can still use app offline/local only
  → Sync still works (can recover data on fix)
  → All AI features grey out
  
Day 15 (Grace expires)
  ↓
  → Sync also disabled
  → Offline-only mode
  → Contact support

Payment fixed (any day)
  ↓
  → AI features immediately restored
  → Tokens restored to account
```

**Why This Order Matters:**
- AI is costly (externally billed to you from OpenAI)
- Sync is cheap (just database operations)
- Disabling expensive features first = loss prevention
- User still sees value (offline access) → incentive to fix payment

---

## 🏗 Server-Side Atomic Transactions ✅

**Critical: Tokens must NEVER be lost or duplicated**

### Safe Transaction Flow:
```
1. User clicks "Generate Goal"
   ↓
2. Abuse check battery runs
   ↓
3. Validate AI operation allowed (license check)
   ↓
4. Execute AI operation (OpenAI call)
   ↓
5. IF success → Deduct tokens atomically
   IF failure → DO NOT DEDUCT (auto-refund on timeout)
   ↓
6. Log transaction immutably
```

### Code:
```typescript
const { result, tokenResult } = await executeWithTokenRefund(
  {
    organizationId: 'org-123',
    userId: 'user-456',
    featureUsed: 'generate_goal',
    tokensRequested: 3,
  },
  async () => {
    // This runs BEFORE token deduction
    return await generateGoalWithAI(...);
  },
  30000 // 30 second timeout
);

// If generateGoalWithAI() fails or times out:
// → Zero tokens deducted
// → User can retry
// → No token loss

// If succeeds:
// → Exactly 3 tokens deducted
// → Audit logged
// → User sees remaining balance
```

### Failure Handling:
- **API Call Fails** → 0 tokens deducted
- **API Call Times Out** → 0 tokens deducted (auto-refund trigger)
- **Update DB Fails** → Logged for manual review
- **Log Entry Fails** → Still deducted (don't lose transaction)

---

## 💻 "Buy Extra Credits" Revenue Engine ✅

### Stripe Integration:

```typescript
// 1. User clicks "Buy 500 tokens ($29)"
const intent = await createTokenPurchaseIntent(orgId, userId, 0);

// 2. User sees Stripe payment modal
// 3. Payment succeeds
// 4. Webhook fires → processTokenPurchaseSuccess()
// 5. Tokens added to account
// 6. Update immediately reflects

TOKEN_PACKAGES = [
  { tokens: 500, price: $29, discount: '42% off' },  // $0.058 per token
  { tokens: 2000, price: $79, discount: '37% off' }, // $0.0395 per token
]
```

**Revenue Model:**
- Base cost per token: $0.01
- Sell for: $0.058-0.0395 per token
- Gross margin: 79-67%

**Pro Upsell Flow:**
```
Pro user: 150 tokens remaining, wants to generate goals

Option A (current):
  → "Upgrade to Enterprise for $399/month"
  → User leaves (too expensive) → $0 revenue

Option B (with marketplac):
  → "Buy 500 tokens for $29"
  → User clicks → Pays $29
  → Instant gratification ✅
  → $24.65 revenue ✅
  → Margin: 85% ✅
```

**Pricing Psychology:**
- $29 feels like "emergency tokens" not a plan upgrade
- Lower friction than deciding between tiers
- Can trigger multiple purchases over time
- Pure margin revenue (improves CAC payback)

---

## 📊 Monitoring Metrics

### Daily Checks:
```sql
-- Token burn rate (should be steady, not spiky)
SELECT DATE(created_at), SUM(tokens_deducted) 
FROM ai_token_usage_log
GROUP BY DATE(created_at) ORDER BY DATE DESC LIMIT 7;

-- Fraud alerts (0 is target)
SELECT COUNT(*) FROM ai_token_usage_log 
WHERE metadata->>'status' = 'fraud_flagged' AND created_at > now() - interval '1 day';

-- Failed attempts (investigate spikes)
SELECT user_id, COUNT(*) 
FROM ai_token_usage_log
WHERE metadata->>'status' IN ('prevented', 'failed')
AND created_at > now() - interval '1 hour'
GROUP BY user_id HAVING COUNT(*) > 3;
```

### Monthly Financials:
```
Pro Revenue:          $149 × N customers = $XX,XXX
Enterprise Revenue:   $399 × M customers = $YY,YYY
Token Sales Revenue:  $XX,XXX (pure margin)
Total AI Cost:        -(token_used × $0.01) = -$X,XXX
Gross Margin:         (Revenue - Cost) / Revenue = 85-95%
```

---

## 🎯 Business Outcomes This Enables

### Revenue Generation
✅ Recurring $149 Pro + $399 Enterprise tiers
✅ One-time $29/$79 token purchases (high margin)
✅ Upsells via "out of tokens" modal
✅ Predictable monthly costs (prevents surprises)

### Cost Control
✅ Hard caps prevent runaway AI costs
✅ Abuse prevention blocks deliberate waste
✅ Rate limiting protects against accidents
✅ Transaction safety prevents token loss

### User Segmentation
✅ Starter: Free users, no AI (lowest support cost)
✅ Pro: AI limited to ~6 goals/month (~$2 cost to you)
✅ Enterprise: Power users, high limit ($20 cost to you)
✅ Pro+ buyers: High margin token purchases

### Growth Metrics
✅ Can track "out of tokens" events (conversion signal)
✅ Can track token purchases (expansion revenue)
✅ Can identify power users (upsell candidates)
✅ Can detect abuse patterns (churn risk)

---

## 🔐 Security & Compliance

- ✅ All tokens deducted server-side only
- ✅ Complete audit trail in `ai_token_usage_log`
- ✅ Fraud detection with automatic alerts
- ✅ Atomic transactions prevent data loss
- ✅ RLS policies enforce org isolation
- ✅ Grace period logic protects users from overage charges

---

## 🚀 Deployment Order

1. ✅ Deploy Business Rules config
2. ✅ Deploy Atomic Transaction wrapper
3. ✅ Deploy Abuse Prevention layer
4. ✅ Deploy License Synergy layer
5. ✅ Deploy Marketplace/Credit Purchase
6. **Update integrations to use all layers** ← Do this next
7. Test end-to-end
8. Monitor for 1 week
9. Enable token purchases UI
10. Monitor revenue

---

## 📋 Next Steps for Engineering

Update `FinancialGoalsClient.tsx` quest generation to use:
1. `runAbuseCheckBattery()` - Prevent abuse
2. `validateAIOperationAllowed()` - Check license status
3. `executeWithTokenRefund()` - Safe token handling
4. `checkGracePeriod()` - Handle degradation

This turns the system from "just tracking tokens" into a real business-protecting, revenue-generating system.
