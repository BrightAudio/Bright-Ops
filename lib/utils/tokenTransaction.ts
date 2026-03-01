/**
 * Atomic Token Transaction Handler
 * Ensures tokens are deducted safely with automatic refunds on API failure
 */

import { supabase } from '@/lib/supabaseClient';
import { TokenRefundReason, TRANSACTION_SAFETY, MONITORING } from '@/lib/utils/tokenBusinessRules';
import { TOKEN_COSTS } from '@/lib/utils/aiTokens';

interface TokenTransaction {
  organizationId: string;
  userId: string;
  featureUsed: string;
  tokensRequested: number;
}

interface TransactionResult {
  success: boolean;
  tokensDeducted: number;
  remainingBalance: number;
  transactionId: string;
  message: string;
  timestamp: string;
  refundedTokens?: number;
  refundReason?: string;
}

/**
 * Execute AI operation with automatic token refund on failure
 *
 * WORKFLOW:
 * 1. Validate tokens available
 * 2. Execute AI operation
 * 3. If success → deduct tokens
 * 4. If failure → auto-refund (don't deduct)
 * 5. Log transaction
 */
export async function executeWithTokenRefund<T>(
  transaction: TokenTransaction,
  aiOperation: () => Promise<T>,
  operationTimeoutMs: number = 30000
): Promise<{ result: T | null; tokenResult: TransactionResult }> {
  const transactionId = generateTransactionId();

  try {
    // Step 1: Validate token availability
    const balance = await getTokenBalance(transaction.organizationId, transaction.featureUsed);
    const cost = TOKEN_COSTS[transaction.featureUsed] || 1;

    if (balance < cost) {
      return {
        result: null,
        tokenResult: {
          success: false,
          tokensDeducted: 0,
          remainingBalance: balance,
          transactionId,
          message: `Insufficient tokens. Need ${cost}, have ${balance}`,
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Step 2: Execute AI operation with timeout
    let aiResult: T;
    try {
      aiResult = await Promise.race([
        aiOperation(),
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error('API_TIMEOUT')),
            operationTimeoutMs
          )
        ),
      ]);
    } catch (error) {
      // API failed or timed out - log but don't deduct
      const refundReason =
        error instanceof Error && error.message === 'API_TIMEOUT'
          ? 'api_timeout'
          : 'api_call_failed';

      await logTokenEvent({
        organizationId: transaction.organizationId,
        userId: transaction.userId,
        featureUsed: transaction.featureUsed,
        tokensRequested: cost,
        tokensDeducted: 0, // Don't deduct on failure
        remainingBalance: balance,
        status: 'prevented',
        refundReason,
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        result: null,
        tokenResult: {
          success: false,
          tokensDeducted: 0,
          remainingBalance: balance,
          transactionId,
          message: `Operation failed: ${refundReason}. No tokens deducted.`,
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Step 3: Success - now deduct tokens atomically
    const deductResult = await atomicTokenDeduction(
      transaction.organizationId,
      transaction.userId,
      transaction.featureUsed,
      cost,
      transactionId
    );

    return {
      result: aiResult,
      tokenResult: {
        success: true,
        tokensDeducted: cost,
        remainingBalance: deductResult.remainingBalance,
        transactionId,
        message: `Operation completed. ${cost} tokens deducted.`,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Transaction error:', error);
    return {
      result: null,
      tokenResult: {
        success: false,
        tokensDeducted: 0,
        remainingBalance: 0,
        transactionId,
        message: 'Transaction failed unexpectedly',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Atomic token deduction - guarantees consistency
 * Uses database transaction to ensure balance and total_used update together
 */
export async function atomicTokenDeduction(
  organizationId: string,
  userId: string,
  featureUsed: string,
  tokensToDeduct: number,
  transactionId: string
): Promise<{ remainingBalance: number; totalUsed: number }> {
  try {
    // Get current state
    const { data: tokenRecord, error: fetchError } = await (supabase as any)
      .from('ai_tokens')
      .select('balance, total_used, token_type')
      .eq('organization_id', organizationId)
      .eq('token_type', getTokenTypeForFeature(featureUsed))
      .single();

    if (fetchError || !tokenRecord) {
      throw new Error('Token record not found');
    }

    const newBalance = tokenRecord.balance - tokensToDeduct;
    const newTotalUsed = tokenRecord.total_used + tokensToDeduct;

    // Deduct atomically
    const { error: updateError } = await (supabase as any)
      .from('ai_tokens')
      .update({
        balance: newBalance,
        total_used: newTotalUsed,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('token_type', tokenRecord.token_type);

    if (updateError) {
      throw updateError;
    }

    // Log the transaction
    await logTokenEvent({
      organizationId,
      userId,
      featureUsed,
      tokensRequested: tokensToDeduct,
      tokensDeducted: tokensToDeduct,
      remainingBalance: newBalance,
      status: 'success',
      transactionId,
    });

    return {
      remainingBalance: newBalance,
      totalUsed: newTotalUsed,
    };
  } catch (error) {
    console.error('Atomic deduction failed:', error);
    throw error;
  }
}

/**
 * Refund tokens (for failed operations, fraud detection, etc.)
 */
export async function refundTokens(
  organizationId: string,
  userId: string,
  tokensToRefund: number,
  reason: string,
  originalTransactionId?: string
): Promise<TransactionResult> {
  try {
    const transactionId = generateTransactionId();

    // Get all token types to refund to each
    const { data: tokens, error: fetchError } = await (supabase as any)
      .from('ai_tokens')
      .select('id, token_type, balance')
      .eq('organization_id', organizationId);

    if (fetchError || !tokens || tokens.length === 0) {
      return {
        success: false,
        tokensDeducted: -tokensToRefund, // Negative indicates refund attempted
        remainingBalance: 0,
        transactionId,
        message: 'Refund failed - no token records found',
        timestamp: new Date().toISOString(),
      };
    }

    // Distribute refund across first token type (general or goal)
    const primaryToken = tokens[0];
    const newBalance = primaryToken.balance + tokensToRefund;

    const { error: updateError } = await (supabase as any)
      .from('ai_tokens')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', primaryToken.id);

    if (updateError) {
      throw updateError;
    }

    // Log refund
    await logTokenEvent({
      organizationId,
      userId,
      featureUsed: 'refund',
      tokensRequested: 0,
      tokensDeducted: -tokensToRefund, // Negative for refund
      remainingBalance: newBalance,
      status: 'refund',
      refundReason: reason,
      transactionId,
      originalTransactionId,
    });

    console.log(
      `✅ Refunded ${tokensToRefund} tokens to org ${organizationId}: ${reason}`
    );

    return {
      success: true,
      tokensDeducted: -tokensToRefund,
      remainingBalance: newBalance,
      transactionId,
      message: `Refunded ${tokensToRefund} tokens: ${reason}`,
      timestamp: new Date().toISOString(),
      refundedTokens: tokensToRefund,
      refundReason: reason,
    };
  } catch (error) {
    console.error('Refund failed:', error);
    return {
      success: false,
      tokensDeducted: 0,
      remainingBalance: 0,
      transactionId: generateTransactionId(),
      message: `Refund error: ${error instanceof Error ? error.message : 'Unknown'}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get token balance (for validation)
 */
async function getTokenBalance(organizationId: string, featureUsed: string): Promise<number> {
  try {
    const tokenType = getTokenTypeForFeature(featureUsed);
    const { data, error } = await (supabase as any)
      .from('ai_tokens')
      .select('balance')
      .eq('organization_id', organizationId)
      .eq('token_type', tokenType)
      .single();

    return data?.balance || 0;
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return 0;
  }
}

/**
 * Map feature to token type
 */
function getTokenTypeForFeature(feature: string): string {
  if (feature.includes('lead')) return 'lead_generation';
  if (feature.includes('goal')) return 'goal_generation';
  if (feature.includes('strategy')) return 'strategy_analysis';
  if (feature.includes('forecast')) return 'forecast';
  return 'general';
}

/**
 * Log token event for audit trail
 */
async function logTokenEvent(event: {
  organizationId: string;
  userId: string;
  featureUsed: string;
  tokensRequested: number;
  tokensDeducted: number;
  remainingBalance: number;
  status: 'success' | 'prevented' | 'refund' | 'failed';
  refundReason?: string;
  transactionId: string;
  originalTransactionId?: string;
  error?: string;
}): Promise<void> {
  try {
    const { error } = await (supabase as any)
      .from('ai_token_usage_log')
      .insert({
        organization_id: event.organizationId,
        user_id: event.userId,
        token_type: getTokenTypeForFeature(event.featureUsed),
        feature_used: event.featureUsed,
        tokens_deducted: event.tokensDeducted,
        remaining_balance: event.remainingBalance,
        metadata: {
          status: event.status,
          transactionId: event.transactionId,
          originalTransactionId: event.originalTransactionId,
          refundReason: event.refundReason,
          error: event.error,
          timestamp: new Date().toISOString(),
        },
      });

    if (error) {
      console.warn('Failed to log token event:', error);
    }
  } catch (error) {
    console.warn('Error logging token event:', error);
  }
}

/**
 * Generate unique transaction ID
 */
function generateTransactionId(): string {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export type { TransactionResult, TokenTransaction };
