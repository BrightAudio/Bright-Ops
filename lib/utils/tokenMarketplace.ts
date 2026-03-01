/**
 * AI Credits Marketplace
 * One-time Stripe purchases for additional AI tokens
 */

import Stripe from 'stripe';
import { TOKEN_POLICY } from '@/lib/utils/tokenBusinessRules';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover' as any,
});

/**
 * Available token packages for purchase
 */
export const TOKEN_PACKAGES = TOKEN_POLICY.tokenPurchaseOptions.map((pkg) => ({
  ...pkg,
  stripeId: `token_pkg_${pkg.tokens}`, // Would be stored in Supabase
  features: [
    `${pkg.tokens} AI tokens`,
    'Valid for 12 months',
    'Use across all AI features',
    'Combines with monthly allocation',
  ],
}));

/**
 * Create Stripe payment intent for token purchase
 */
export async function createTokenPurchaseIntent(
  organizationId: string,
  userId: string,
  packageIndex: number
): Promise<{
  clientSecret: string;
  amount: number;
  tokens: number;
}> {
  try {
    const pkg = TOKEN_PACKAGES[packageIndex];
    if (!pkg) {
      throw new Error('Invalid package selection');
    }

    // Create payment intent
    const intent = await stripe.paymentIntents.create({
      amount: pkg.price_cents, // Already in cents
      currency: 'usd',
      metadata: {
        organizationId,
        userId,
        tokens: String(pkg.tokens),
        packageLabel: pkg.label,
        type: 'ai_token_purchase',
      },
      description: `${pkg.label} for organization ${organizationId}`,
    });

    return {
      clientSecret: intent.client_secret!,
      amount: pkg.price_cents / 100, // Convert to dollars for display
      tokens: pkg.tokens,
    };
  } catch (error) {
    console.error('Error creating token purchase intent:', error);
    throw error;
  }
}

/**
 * Process completed token purchase (called by Stripe webhook)
 */
export async function processTokenPurchaseSuccess(
  organizationId: string,
  userId: string,
  tokens: number,
  paymentIntentId: string
): Promise<boolean> {
  try {
    // Add tokens to organization
    // Call your supabase function to do this atomically

    const { supabase } = await import('@/lib/supabaseClient');

    const { data: tokenRecord, error: fetchError } = await (supabase as any)
      .from('ai_tokens')
      .select('balance, total_allocated, id')
      .eq('organization_id', organizationId)
      .eq('token_type', 'general') // Use general pool for purchases
      .single();

    if (fetchError) throw fetchError;

    const newBalance = tokenRecord.balance + tokens;
    const newAllocated = tokenRecord.total_allocated + tokens;

    const { error: updateError } = await (supabase as any)
      .from('ai_tokens')
      .update({
        balance: newBalance,
        total_allocated: newAllocated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokenRecord.id);

    if (updateError) throw updateError;

    // Log the purchase
    await logTokenPurchase({
      organizationId,
      userId,
      tokens,
      paymentIntentId,
      status: 'completed',
    });

    console.log(`✅ Added ${tokens} purchased tokens to org ${organizationId}`);
    return true;
  } catch (error) {
    console.error('Error processing token purchase:', error);

    // Log failed purchase
    await logTokenPurchase({
      organizationId,
      userId,
      tokens,
      paymentIntentId,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return false;
  }
}

/**
 * Generate token purchase receipt/invoice
 */
export async function generateTokenPurchaseReceipt(
  organizationId: string,
  userId: string,
  tokens: number,
  amountPaid: number,
  paymentIntentId: string
): Promise<string> {
  return `
TOKEN PURCHASE RECEIPT

Organization: ${organizationId}
User: ${userId}
Purchase ID: ${paymentIntentId}
Date: ${new Date().toISOString()}

Items Purchased:
- AI Tokens: ${tokens}
- Price: $${(amountPaid / 100).toFixed(2)}
- Valid Until: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}

Token Balance: ${tokens}
Can be used across:
- Goal Generation
- Lead Generation  
- Strategy Analysis
- Revenue Forecasting

Questions? Contact support@brightaudio.com
`;
}

/**
 * Log token purchase for analytics
 */
async function logTokenPurchase(data: {
  organizationId: string;
  userId: string;
  tokens: number;
  paymentIntentId: string;
  status: 'completed' | 'failed';
  error?: string;
}): Promise<void> {
  try {
    const { supabase } = await import('@/lib/supabaseClient');

    // Could create separate table or use metadata in ai_tokens
    console.log(`[TOKEN PURCHASE] Status: ${data.status} | Tokens: ${data.tokens}`, data);

    // TODO: Create ai_token_purchases table for detailed analytics
  } catch (error) {
    console.warn('Error logging token purchase:', error);
  }
}

/**
 * Display token package to user
 */
export interface TokenPackageDisplay {
  label: string;
  tokens: number;
  price: string;
  pricePerToken: string;
  discount: string; // Show savings vs. base price
  popular?: boolean;
  buttonText: string;
}

/**
 * Format packages for display in UI
 */
export function formatTokenPackagesForUI(): TokenPackageDisplay[] {
  return TOKEN_PACKAGES.map((pkg, idx) => {
    const pricePerToken = (pkg.price_cents / pkg.tokens / 100).toFixed(4);
    const basePrice = 0.01; // Assume $0.01 per token baseline

    return {
      label: pkg.label,
      tokens: pkg.tokens,
      price: `$${(pkg.price_cents / 100).toFixed(2)}`,
      pricePerToken: `$${pricePerToken}/token`,
      discount: `${Math.round((1 - parseFloat(pricePerToken) / basePrice) * 100)}% off`,
      popular: idx === TOKEN_PACKAGES.length - 1,
      buttonText: `Get ${pkg.label}`,
    };
  });
}
