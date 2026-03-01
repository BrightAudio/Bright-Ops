/**
 * Token Abuse Prevention
 * Rate limiting, fraud detection, output validation
 */

import { supabase } from '@/lib/supabaseClient';
import { ABUSE_PREVENTION } from '@/lib/utils/tokenBusinessRules';

interface AbuseCheckResult {
  allowed: boolean;
  reason?: string;
  remainingRequests?: number;
}

interface FraudAlert {
  userId: string;
  organizationId: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high';
  details: Record<string, any>;
  shouldBlock: boolean;
}

/**
 * RATE LIMITING: Check if user can make another AI request
 */
export async function checkRateLimit(
  userId: string,
  organizationId: string
): Promise<AbuseCheckResult> {
  try {
    // Get requests in last minute
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

    const { data, error } = await (supabase as any)
      .from('ai_token_usage_log')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .gte('created_at', oneMinuteAgo);

    if (error) {
      console.warn('Rate limit check error:', error);
      return { allowed: true }; // Fail open - don't block if we can't check
    }

    const requestsThisMinute = data?.length || 0;
    const remaining = ABUSE_PREVENTION.maxRequestsPerMinute - requestsThisMinute;

    if (requestsThisMinute >= ABUSE_PREVENTION.maxRequestsPerMinute) {
      return {
        allowed: false,
        reason: `Rate limit exceeded. Max ${ABUSE_PREVENTION.maxRequestsPerMinute} requests per minute.`,
        remainingRequests: 0,
      };
    }

    return {
      allowed: true,
      remainingRequests: remaining,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true }; // Fail open
  }
}

/**
 * FREQUENCY CHECK: Ensure minimum time between requests
 */
export async function checkMinimumTimeBetweenRequests(
  userId: string,
  organizationId: string
): Promise<AbuseCheckResult> {
  try {
    // Get last request
    const { data, error } = await (supabase as any)
      .from('ai_token_usage_log')
      .select('created_at')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { allowed: true }; // First request
    }

    const lastRequestTime = new Date(data.created_at);
    const timeSinceLastRequest = (Date.now() - lastRequestTime.getTime()) / 1000;
    const minSeconds = ABUSE_PREVENTION.minSecondsBetweenRequests;

    if (timeSinceLastRequest < minSeconds) {
      const waitTime = Math.ceil(minSeconds - timeSinceLastRequest);
      return {
        allowed: false,
        reason: `Please wait ${waitTime} seconds between requests.`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Frequency check error:', error);
    return { allowed: true }; // Fail open
  }
}

/**
 * TOKEN SIZE CHECK: Prevent single requests from burning huge amounts
 */
export function validateTokenRequest(tokensRequested: number): AbuseCheckResult {
  if (tokensRequested > ABUSE_PREVENTION.maxTokensPerRequest) {
    return {
      allowed: false,
      reason: `Request exceeds max tokens per request (${ABUSE_PREVENTION.maxTokensPerRequest}). This shouldn't happen - contact support.`,
    };
  }

  return { allowed: true };
}

/**
 * OUTPUT SIZE VALIDATION: Prevent AI from generating huge responses
 */
export async function validateAIOutput(
  outputTokens: number,
  feature: string
): Promise<AbuseCheckResult> {
  if (outputTokens > ABUSE_PREVENTION.maxOutputTokens) {
    return {
      allowed: false,
      reason: `AI output too large (${outputTokens} tokens). Max allowed: ${ABUSE_PREVENTION.maxOutputTokens}. Request may have been incomplete.`,
    };
  }

  return { allowed: true };
}

/**
 * FRAUD DETECTION: Identify suspicious patterns
 */
export async function detectFraudPattern(
  userId: string,
  organizationId: string
): Promise<FraudAlert | null> {
  try {
    // Check if user burned too many tokens in short time
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    const { data, error } = await (supabase as any)
      .from('ai_token_usage_log')
      .select('tokens_deducted')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .gte('created_at', oneHourAgo);

    if (error) {
      console.warn('Fraud detection error:', error);
      return null; // Fail open
    }

    const totalTokensThisHour =
      data?.reduce((sum: number, row: any) => sum + (row.tokens_deducted || 0), 0) || 0;

    if (totalTokensThisHour > ABUSE_PREVENTION.fraudThresholds.tokensPerHourAlert) {
      const alert: FraudAlert = {
        userId,
        organizationId,
        violationType: 'high_token_burn',
        severity: 'medium',
        details: {
          tokensThisHour: totalTokensThisHour,
          threshold: ABUSE_PREVENTION.fraudThresholds.tokensPerHourAlert,
          percentOfMonthly: (
            (totalTokensThisHour / 2000) * 100 // Assuming 2000/month for Pro
          ).toFixed(1),
        },
        shouldBlock: false, // Alert but don't block
      };

      console.warn('🚨 Fraud alert:', alert);
      await logFraudAlert(alert);
      return alert;
    }

    return null;
  } catch (error) {
    console.error('Fraud detection error:', error);
    return null; // Fail open
  }
}

/**
 * FAILED ATTEMPT TRACKING: Block after repeated failures
 */
export async function trackFailedAttempt(
  userId: string,
  organizationId: string
): Promise<AbuseCheckResult> {
  try {
    // Check failed attempts in last 24 hours
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();

    const { data, error } = await (supabase as any)
      .from('ai_token_usage_log')
      .select('metadata')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .gte('created_at', oneDayAgo);

    if (error) {
      return { allowed: true };
    }

    const failedAttempts = data?.filter(
      (row: any) => row.metadata?.status === 'prevented' || row.metadata?.status === 'failed'
    ).length || 0;

    if (failedAttempts > ABUSE_PREVENTION.fraudThresholds.failedAttemptsBeforeBlock) {
      return {
        allowed: false,
        reason: `Too many failed attempts. Your account has been temporarily restricted. Contact support.`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.warn('Failed attempt tracking error:', error);
    return { allowed: true }; // Fail open
  }
}

/**
 * COMPREHENSIVE ABUSE CHECK
 * Runs all checks before allowing token deduction
 */
export async function runAbuseCheckBattery(
  userId: string,
  organizationId: string,
  tokensRequested: number
): Promise<AbuseCheckResult> {
  // 1. Rate limit
  const rateCheck = await checkRateLimit(userId, organizationId);
  if (!rateCheck.allowed) return rateCheck;

  // 2. Frequency
  const frequencyCheck = await checkMinimumTimeBetweenRequests(userId, organizationId);
  if (!frequencyCheck.allowed) return frequencyCheck;

  // 3. Token size
  const tokenCheck = validateTokenRequest(tokensRequested);
  if (!tokenCheck.allowed) return tokenCheck;

  // 4. Failed attempts
  const failedCheck = await trackFailedAttempt(userId, organizationId);
  if (!failedCheck.allowed) return failedCheck;

  // 5. Fraud detection (warning only, doesn't block)
  const fraudAlert = await detectFraudPattern(userId, organizationId);
  if (fraudAlert?.shouldBlock) {
    return {
      allowed: false,
      reason: 'Suspicious activity detected. Your account has been restricted.',
    };
  }

  return { allowed: true };
}

/**
 * LOG FRAUD ALERT FOR ADMIN REVIEW
 */
async function logFraudAlert(alert: FraudAlert): Promise<void> {
  try {
    // Create admin alert (could be separate table or Supabase functions)
    console.log(
      `[FRAUD ALERT] User: ${alert.userId} | Org: ${alert.organizationId} | Type: ${alert.violationType}`
    );

    // In production, would send to Slack/PagerDuty
    // await notifyAdmins(alert);
  } catch (error) {
    console.warn('Error logging fraud alert:', error);
  }
}
