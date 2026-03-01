/**
 * AI Token System - Tier-based limits and token management
 * Tracks usage of AI features like lead generation, goal creation, strategy analysis
 */

import { supabase } from '@/lib/supabaseClient';

export type TokenType = 'lead_generation' | 'goal_generation' | 'strategy_analysis' | 'forecast' | 'general';
export type Plan = 'starter' | 'pro' | 'enterprise';

/**
 * Token limits per tier - refreshes monthly
 */
export const TOKEN_LIMITS: Record<Plan, Record<TokenType, number>> = {
  starter: {
    lead_generation: 0, // No AI leads for starter
    goal_generation: 0, // No AI goals for starter
    strategy_analysis: 0,
    forecast: 0,
    general: 0,
  },
  pro: {
    lead_generation: 50, // 50 AI-generated leads per month
    goal_generation: 20, // 20 goal generation calls
    strategy_analysis: 100, // 100 strategy analyses
    forecast: 30, // 30 forecast runs
    general: 50,
  },
  enterprise: {
    lead_generation: 500, // Unlimited essentially
    goal_generation: 200,
    strategy_analysis: 1000,
    forecast: 200,
    general: 500,
  },
};

/**
 * Token cost per feature
 */
export const TOKEN_COSTS: Record<string, number> = {
  'generate_leads': 5, // 5 tokens per lead generation batch
  'generate_goal': 3,
  'analyze_strategy': 2,
  'forecast_revenue': 4,
  'analyze_efficiency': 2,
  'generate_insight': 1,
};

/**
 * Initialize tokens for organization when they sign up
 */
export async function initializeTokens(
  organizationId: string,
  plan: Plan
): Promise<boolean> {
  try {
    const tokenTypes: TokenType[] = [
      'lead_generation',
      'goal_generation',
      'strategy_analysis',
      'forecast',
      'general',
    ];

    const tokenRecords = tokenTypes.map((tokenType) => ({
      organization_id: organizationId,
      token_type: tokenType,
      balance: TOKEN_LIMITS[plan][tokenType],
      total_allocated: TOKEN_LIMITS[plan][tokenType],
      total_used: 0,
      refresh_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    }));

    const { error } = await (supabase as any)
      .from('ai_tokens')
      .insert(tokenRecords);

    if (error) {
      console.error('Error initializing tokens:', error);
      return false;
    }

    console.log(`✅ Initialized AI tokens for organization ${organizationId} on ${plan} plan`);
    return true;
  } catch (error) {
    console.error('Error in initializeTokens:', error);
    return false;
  }
}

/**
 * Get current token balance for a feature
 */
export async function getTokenBalance(
  organizationId: string,
  tokenType: TokenType
): Promise<number> {
  try {
    const { data, error } = await (supabase as any)
      .from('ai_tokens')
      .select('balance')
      .eq('organization_id', organizationId)
      .eq('token_type', tokenType)
      .single();

    if (error) {
      console.warn(`Token balance not found for ${tokenType}:`, error);
      return 0;
    }

    return data?.balance || 0;
  } catch (error) {
    console.error('Error getting token balance:', error);
    return 0;
  }
}

/**
 * Get all token balances for organization
 */
export async function getAllTokenBalances(organizationId: string): Promise<Record<TokenType, number>> {
  try {
    const { data, error } = await (supabase as any)
      .from('ai_tokens')
      .select('token_type, balance')
      .eq('organization_id', organizationId);

    if (error) {
      console.warn('Error fetching token balances:', error);
      return {
        lead_generation: 0,
        goal_generation: 0,
        strategy_analysis: 0,
        forecast: 0,
        general: 0,
      };
    }

    const balances: Record<TokenType, number> = {
      lead_generation: 0,
      goal_generation: 0,
      strategy_analysis: 0,
      forecast: 0,
      general: 0,
    };

    data?.forEach((record: any) => {
      balances[record.token_type as TokenType] = record.balance;
    });

    return balances;
  } catch (error) {
    console.error('Error in getAllTokenBalances:', error);
    return {
      lead_generation: 0,
      goal_generation: 0,
      strategy_analysis: 0,
      forecast: 0,
      general: 0,
    };
  }
}

/**
 * Check if organization has enough tokens
 */
export async function hasEnoughTokens(
  organizationId: string,
  featureUsed: string
): Promise<boolean> {
  try {
    const cost = TOKEN_COSTS[featureUsed] || 1;
    const tokenType = getTokenTypeForFeature(featureUsed);
    const balance = await getTokenBalance(organizationId, tokenType);

    return balance >= cost;
  } catch (error) {
    console.error('Error checking tokens:', error);
    return false;
  }
}

/**
 * Deduct tokens for a feature usage
 */
export async function deductTokens(
  organizationId: string,
  userId: string,
  featureUsed: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; remainingBalance: number; message: string }> {
  try {
    const cost = TOKEN_COSTS[featureUsed] || 1;
    const tokenType = getTokenTypeForFeature(featureUsed);

    // Check balance first
    const balance = await getTokenBalance(organizationId, tokenType);

    if (balance < cost) {
      return {
        success: false,
        remainingBalance: balance,
        message: `Insufficient tokens. Need ${cost}, have ${balance}`,
      };
    }

    // Deduct tokens
    const newBalance = balance - cost;
    
    // First, get current total_used to increment it
    const { data: currentData, error: fetchError } = await (supabase as any)
      .from('ai_tokens')
      .select('total_used')
      .eq('organization_id', organizationId)
      .eq('token_type', tokenType)
      .single();

    if (fetchError) {
      console.error('Error fetching current total_used:', fetchError);
      return {
        success: false,
        remainingBalance: balance,
        message: 'Failed to fetch current usage',
      };
    }

    const newTotalUsed = (currentData?.total_used || 0) + cost;

    const { error: updateError } = await (supabase as any)
      .from('ai_tokens')
      .update({
        balance: newBalance,
        total_used: newTotalUsed,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('token_type', tokenType);

    if (updateError) {
      console.error('Error deducting tokens:', updateError);
      return {
        success: false,
        remainingBalance: balance,
        message: 'Failed to deduct tokens',
      };
    }

    // Log the usage
    const { error: logError } = await (supabase as any)
      .from('ai_token_usage_log')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        token_type: tokenType,
        feature_used: featureUsed,
        tokens_deducted: cost,
        remaining_balance: newBalance,
        metadata: metadata || {},
      });

    if (logError) {
      console.warn('Error logging token usage:', logError);
      // Don't fail if logging fails, tokens were still deducted
    }

    console.log(`✅ Deducted ${cost} tokens for ${featureUsed}. Remaining: ${newBalance}`);

    return {
      success: true,
      remainingBalance: newBalance,
      message: `Used ${cost} tokens for ${featureUsed}`,
    };
  } catch (error) {
    console.error('Error in deductTokens:', error);
    return {
      success: false,
      remainingBalance: 0,
      message: 'Error processing token deduction',
    };
  }
}

/**
 * Map feature to token type
 */
function getTokenTypeForFeature(feature: string): TokenType {
  if (feature.includes('lead')) return 'lead_generation';
  if (feature.includes('goal')) return 'goal_generation';
  if (feature.includes('strategy')) return 'strategy_analysis';
  if (feature.includes('forecast')) return 'forecast';
  return 'general';
}

/**
 * Upgrade tokens for organization (admin only)
 */
export async function upgradeTokens(
  organizationId: string,
  tokenType: TokenType,
  additionalTokens: number
): Promise<boolean> {
  try {
    // Get current values
    const { data: currentData, error: fetchError } = await (supabase as any)
      .from('ai_tokens')
      .select('balance, total_allocated')
      .eq('organization_id', organizationId)
      .eq('token_type', tokenType)
      .single();

    if (fetchError) {
      console.error('Error fetching current token data:', fetchError);
      return false;
    }

    const newBalance = (currentData?.balance || 0) + additionalTokens;
    const newAllocated = (currentData?.total_allocated || 0) + additionalTokens;

    const { error } = await (supabase as any)
      .from('ai_tokens')
      .update({
        balance: newBalance,
        total_allocated: newAllocated,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('token_type', tokenType);

    if (error) {
      console.error('Error upgrading tokens:', error);
      return false;
    }

    console.log(`✅ Added ${additionalTokens} tokens to ${tokenType}`);
    return true;
  } catch (error) {
    console.error('Error in upgradeTokens:', error);
    return false;
  }
}

/**
 * Get token usage statistics for organization
 */
export async function getTokenStats(organizationId: string): Promise<any> {
  try {
    const { data, error } = await (supabase as any)
      .from('ai_tokens')
      .select('token_type, balance, total_allocated, total_used, refresh_date')
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Error fetching token stats:', error);
      return null;
    }

    const stats = {
      totalBalance: 0,
      totalAllocated: 0,
      totalUsed: 0,
      byType: data || [],
      refreshDate: data?.[0]?.refresh_date,
    };

    data?.forEach((token: any) => {
      stats.totalBalance += token.balance;
      stats.totalAllocated += token.total_allocated;
      stats.totalUsed += token.total_used;
    });

    return stats;
  } catch (error) {
    console.error('Error in getTokenStats:', error);
    return null;
  }
}
