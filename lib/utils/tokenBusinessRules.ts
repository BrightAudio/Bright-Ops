/**
 * Token Business Rules & Policies
 * Enforces strategic pricing, abuse prevention, and degradation logic
 */

/**
 * 1. TOKEN ADDITIVE BEHAVIOR POLICY
 * Decides whether tokens roll over, can be purchased, etc.
 */
export const TOKEN_POLICY = {
  // Should unused tokens roll over to next month?
  rollover: false,
  // Is there a hard cap per tier, or do tokens get refunded for failures?
  hardCapPerTier: true,
  // Can users purchase additional tokens?
  allowTokenPurchase: true,
  // What's the default token purchase offer?
  tokenPurchaseOptions: [
    { tokens: 500, price_cents: 2900, label: '+500 tokens' }, // $29
    { tokens: 2000, price_cents: 7900, label: '+2000 tokens' }, // $79
  ],
  // For Enterprise, is it truly unlimited or a high cap?
  enterpriseHasCap: true,
  enterpriseCapTokensPerMonth: 2000, // Set this realistically (not 9999)
};

/**
 * 2. TOKEN EXHAUSTION BEHAVIOR
 * What happens when user hits 0 tokens
 */
export const EXHAUSTION_BEHAVIOR = {
  // Hard block on 0, or allow grace?
  hardBlockAt0: true,
  graceUses: 0, // Set to 0 for hard block, 1-2 for grace uses
  // Error message shown to user
  errorMessage: 'You have reached your AI feature limit. Upgrade to Enterprise or purchase additional credits.',
  // Should we show upgrade modal?
  showUpgradeModal: true,
  // Link to credit purchase page
  purchaseLink: '/account/buy-credits',
};

/**
 * 3. ABUSE PREVENTION
 * Rate limits, output caps, frequency throttling
 */
export const ABUSE_PREVENTION = {
  // Max tokens that can be deducted in a single request
  maxTokensPerRequest: 10, // Prevents someone burning 100 tokens instantly
  // Max requests per minute per user
  maxRequestsPerMinute: 30,
  // Max output tokens from AI (prevents token burn on huge responses)
  maxOutputTokens: 2000,
  // Minimum wait time between requests (seconds)
  minSecondsBetweenRequests: 3,
  // Track fraud attempts - alert if exceeded
  fraudThresholds: {
    tokensPerHourAlert: 500, // Alert if user burns 500+ tokens/hour
    failedAttemptsBeforeBlock: 5, // Block after 5 invalid requests
  },
};

/**
 * 4. PRICING ALIGNMENT
 * Cost per token, token cost per feature, margin checking
 */
export const PRICING_ALIGNMENT = {
  // Estimated cost to YOU (OpenAI, Claude, etc.) per token
  costPerTokenCents: 1, // $0.01 per token average
  
  // Token cost per feature with margin built in
  tokenCosts: {
    generate_goal: {
      tokensNeeded: 3,
      yourCost: 0.03,
      tier: ['pro', 'enterprise'],
    },
    generate_leads: {
      tokensNeeded: 5,
      yourCost: 0.05,
      tier: ['pro', 'enterprise'],
    },
    forecast_revenue: {
      tokensNeeded: 4,
      yourCost: 0.04,
      tier: ['pro', 'enterprise'],
    },
    analyze_strategy: {
      tokensNeeded: 2,
      yourCost: 0.02,
      tier: ['pro', 'enterprise'],
    },
  },

  // Tier pricing (for margin verification)
  tierPricing: {
    starter: {
      monthlyPrice: 0,
      includedTokens: 0,
      estimatedMargin: 0,
    },
    pro: {
      monthlyPrice: 149,
      includedTokens: 200, // 200 tokens @ $0.01 = $2 cost to you
      estimatedCost: 2.00,
      estimatedMargin: 147.00,
      marginPercent: 98.6,
    },
    enterprise: {
      monthlyPrice: 399,
      includedTokens: 2000, // 2000 tokens @ $0.01 = $20 cost to you
      estimatedCost: 20.00,
      estimatedMargin: 379.00,
      marginPercent: 94.9,
    },
  },

  // If users run out, token purchase margin is much higher (pure profit)
  tokenPurchaseMarginPercent: 85, // $29 → $24.65 revenue
};

/**
 * 5. LICENSE + TOKEN SYNERGY
 * How tokens and licenses interact during payment issues
 */
export const LICENSE_TOKEN_SYNERGY = {
  // Disable AI features FIRST during grace period
  degradationOrder: [
    'ai_features', // Disable all AI first (including tokens)
    'sync_engine', // Then disable sync
    'reports', // Then reports
  ],

  // Timeline for degradation during payment failure
  gracePeriodDays: 14,
  
  // When license status is 'limited' (payment failed):
  onPaymentFailed: {
    disableAIImmediately: true,
    showWarningBanner: true,
    bannerText: 'Payment failed. AI features are disabled. Update your payment method to restore access.',
    refundUnusedTokens: true, // Critical: Return unused tokens when AI is disabled
  },

  // When license status is 'expired':
  onLicenseExpired: {
    disableAIImmediately: true,
    disableSyncImmediately: false,
    allowOfflineModeOnly: true,
  },
};

/**
 * SERVER-SIDE TRANSACTION SAFETY
 * Token deductions must be atomic and handle API failures
 */
export const TRANSACTION_SAFETY = {
  // Always deduct tokens AFTER successful API call? Or BEFORE?
  // Answer: AFTER, with automatic refund on failure
  deductAfterSuccess: true,
  
  // Automatic refund if AI API call fails
  autoRefundOnFailure: true,
  
  // Timeout for API call - if exceeded, auto-refund
  apiCallTimeoutMs: 30000,

  // If refund fails, mark for manual review
  refundFailureAction: 'manual_review', // 'ignore' or 'manual_review' or 'alert_admin'

  // Log all transactions (for audit)
  logAllTransactions: true,
  logLocation: 'ai_token_usage_log',
};

/**
 * MONITORING & ALERTS
 * What to watch for and when to alert
 */
export const MONITORING = {
  // Alert if... (these trigger admin notifications)
  alerts: {
    organizationBurning80PercentMonthly: true,
    organizationAt100PercentMonthly: true,
    suspiciousTokenBurnPattern: true, // e.g., 100 tokens in 5 minutes
    tokenRefundFailure: true,
    highFailureRate: true, // > 5 failed requests/hour
  },

  // Dashboard metrics to track
  dashboardMetrics: [
    'avg_tokens_per_org_per_day',
    'top_features_by_token_use',
    'token_purchase_revenue',
    'token_refund_rate',
    'feature_abuse_attempts',
    'estimated_ai_cost_vs_revenue',
  ],
};

/**
 * HELPER: Calculate if pricing is healthy
 */
export function validatePricingHealth() {
  const proMargin = PRICING_ALIGNMENT.tierPricing.pro.estimatedMargin;
  const enterpriseMargin = PRICING_ALIGNMENT.tierPricing.enterprise.estimatedMargin;

  return {
    proHealthy: proMargin > 100, // Should be $100+/month margin
    enterpriseHealthy: enterpriseMargin > 300, // Should be $300+/month margin
    recommendations: [
      proMargin < 100 ? 'Pro tokens too high - increase price or reduce allocation' : '',
      enterpriseMargin < 300 ? 'Enterprise tokens too high - increase price or reduce allocation' : '',
    ].filter(Boolean),
  };
}

/**
 * HELPER: Token refund reason tracking
 */
export enum TokenRefundReason {
  API_CALL_FAILED = 'api_call_failed',
  TIMEOUT = 'api_timeout',
  LICENSE_DISABLED = 'license_disabled',
  FRAUD_DETECTED = 'fraud_detected',
  RATE_LIMIT_VIOLATED = 'rate_limit_violated',
  OUTPUT_TOO_LARGE = 'output_too_large',
  MANUAL_ADMIN_REFUND = 'manual_admin_refund',
}
