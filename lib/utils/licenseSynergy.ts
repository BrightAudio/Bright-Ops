/**
 * License + Token Synergy
 * Connects license status with token availability
 * AI features disable FIRST during payment issues
 */

import { supabase } from '@/lib/supabaseClient';
import { LICENSE_TOKEN_SYNERGY } from '@/lib/utils/tokenBusinessRules';

export type LicenseStatus = 'active' | 'limited' | 'expired' | 'suspended';
export type DegradationLevel = 'full' | 'limited' | 'offline';

interface SynergyCheckResult {
  allowed: boolean;
  reason?: string;
  licenseStatus: LicenseStatus;
  degradationLevel: DegradationLevel;
  offlineModeAllowed: boolean;
}

/**
 * Check if AI features should be available based on license status
 *
 * Degradation Order:
 * 1. Active → All features available
 * 2. Limited (payment failed) → AI disabled, sync enabled
 * 3. Expired → Only offline mode
 * 4. Suspended → Nothing available
 */
export async function checkAIFeatureAccess(
  organizationId: string
): Promise<SynergyCheckResult> {
  try {
    // Get license status
    const { data: org, error } = await (supabase as any)
      .from('organizations')
      .select('license_status, last_payment_failed_at')
      .eq('id', organizationId)
      .single();

    if (error) {
      return {
        allowed: false,
        reason: 'Organization not found',
        licenseStatus: 'expired',
        degradationLevel: 'offline',
        offlineModeAllowed: false,
      };
    }

    const licenseStatus = org.license_status as LicenseStatus || 'active';

    // Determine degradation level
    const result =
      licenseStatus === 'active'
        ? {
            allowed: true,
            licenseStatus,
            degradationLevel: 'full' as const,
            offlineModeAllowed: true,
          }
        : licenseStatus === 'limited'
          ? {
              allowed: false,
              reason:
                'Your payment failed. Update your payment method to restore AI features.',
              licenseStatus,
              degradationLevel: 'limited' as const,
              offlineModeAllowed: true, // Can still use app with local data
            }
          : licenseStatus === 'expired'
            ? {
                allowed: false,
                reason: 'Your license has expired. Upgrade to restore AI features.',
                licenseStatus,
                degradationLevel: 'offline' as const,
                offlineModeAllowed: true,
              }
            : {
                allowed: false,
                reason: 'Your license is suspended. Contact support.',
                licenseStatus,
                degradationLevel: 'offline' as const,
                offlineModeAllowed: false,
              };

    return result;
  } catch (error) {
    console.error('Error checking AI access:', error);
    return {
      allowed: false,
      reason: 'Unable to verify license. Try again later.',
      licenseStatus: 'active',
      degradationLevel: 'limited',
      offlineModeAllowed: true,
    };
  }
}

/**
 * CRITICAL: Before running any AI operation, check this
 */
export async function validateAIOperationAllowed(
  organizationId: string,
  featureType: string
): Promise<{
  allowed: boolean;
  reason?: string;
  shouldRefundTokens?: boolean; // If license was revoked mid-operation
}> {
  const licenseCheck = await checkAIFeatureAccess(organizationId);

  if (!licenseCheck.allowed) {
    // If operation was attempted but license revoked, need to refund tokens
    return {
      allowed: false,
      reason: licenseCheck.reason,
      shouldRefundTokens: licenseCheck.licenseStatus === 'limited',
    };
  }

  return { allowed: true };
}

/**
 * GRACE PERIOD HANDLER: After payment failure, allow N days before disabling
 */
export async function checkGracePeriod(organizationId: string): Promise<{
  inGracePeriod: boolean;
  daysRemaining: number;
  shouldDisableAI: boolean;
}> {
  try {
    const { data: org, error } = await (supabase as any)
      .from('organizations')
      .select('last_payment_failed_at, license_status')
      .eq('id', organizationId)
      .single();

    if (error || !org) {
      return { inGracePeriod: false, daysRemaining: 0, shouldDisableAI: false };
    }

    if (org.license_status === 'active') {
      return { inGracePeriod: false, daysRemaining: 0, shouldDisableAI: false };
    }

    if (!org.last_payment_failed_at) {
      return { inGracePeriod: false, daysRemaining: 0, shouldDisableAI: true };
    }

    const failureTime = new Date(org.last_payment_failed_at).getTime();
    const daysElapsed = Math.floor((Date.now() - failureTime) / (24 * 60 * 60 * 1000));
    const daysRemaining = LICENSE_TOKEN_SYNERGY.gracePeriodDays - daysElapsed;

    return {
      inGracePeriod: daysRemaining > 0,
      daysRemaining: Math.max(0, daysRemaining),
      shouldDisableAI: daysRemaining <= 0,
    };
  } catch (error) {
    console.error('Error checking grace period:', error);
    return { inGracePeriod: false, daysRemaining: 0, shouldDisableAI: true };
  }
}

/**
 * GET degradation banner content for UI
 */
export function getDegradationBannerContent(status: LicenseStatus): {
  show: boolean;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  actionButton?: { text: string; href: string };
} {
  switch (status) {
    case 'active':
      return {
        show: false,
        type: 'info',
        title: '',
        message: '',
      };

    case 'limited':
      return {
        show: true,
        type: 'warning',
        title: '⚠️ Payment Failed',
        message:
          'Your payment did not go through. Update your payment method to restore AI features.',
        actionButton: {
          text: 'Update Payment',
          href: '/account/billing',
        },
      };

    case 'expired':
      return {
        show: true,
        type: 'error',
        title: '❌ License Expired',
        message: 'Your license has expired. Upgrade to restore AI features and full functionality.',
        actionButton: {
          text: 'Upgrade Now',
          href: '/pricing',
        },
      };

    case 'suspended':
      return {
        show: true,
        type: 'error',
        title: '⛔ Account Suspended',
        message: 'Your account has been suspended. Contact support for assistance.',
        actionButton: {
          text: 'Contact Support',
          href: '/support',
        },
      };

    default:
      return {
        show: false,
        type: 'info',
        title: '',
        message: '',
      };
  }
}

/**
 * AUTO-DISABLE AI FEATURES when license degrades
 * Call this when updating license status
 */
export async function autoDisableAIFeatures(
  organizationId: string,
  newLicenseStatus: LicenseStatus
): Promise<boolean> {
  try {
    if (newLicenseStatus === 'active') {
      // Re-enable AI
      return await updateAIFeaturesEnabled(organizationId, true);
    }

    if (
      newLicenseStatus === 'limited' &&
      LICENSE_TOKEN_SYNERGY.onPaymentFailed.disableAIImmediately
    ) {
      // Disable AI immediately on payment failure
      const success = await updateAIFeaturesEnabled(organizationId, false);

      // Optionally refund unused tokens
      if (LICENSE_TOKEN_SYNERGY.onPaymentFailed.refundUnusedTokens) {
        await refundAllUnusedTokens(organizationId, 'license_disabled');
      }

      return success;
    }

    if (newLicenseStatus === 'expired') {
      // Disable all features
      return await updateAIFeaturesEnabled(organizationId, false);
    }

    return true;
  } catch (error) {
    console.error('Error auto-disabling AI features:', error);
    return false;
  }
}

/**
 * Helper: Update AI features enabled status
 */
async function updateAIFeaturesEnabled(
  organizationId: string,
  enabled: boolean
): Promise<boolean> {
  try {
    const { error } = await (supabase as any)
      .from('organizations')
      .update({
        ai_features_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (error) throw error;

    console.log(`${enabled ? '✅' : '❌'} AI features ${enabled ? 'enabled' : 'disabled'} for org ${organizationId}`);
    return true;
  } catch (error) {
    console.error('Error updating AI feature status:', error);
    return false;
  }
}

/**
 * Refund all tokens when AI is disabled (grace period ending, license expired, etc.)
 */
async function refundAllUnusedTokens(
  organizationId: string,
  reason: string
): Promise<void> {
  try {
    // In production, integrate with tokenTransaction.ts refundTokens()
    // For now, just log
    console.log(
      `📝 Would refund all unused tokens for org ${organizationId}: ${reason}`
    );

    // TODO: Implement actual refund logic
    // const { refundTokens } = await import('@/lib/utils/tokenTransaction');
    // await refundTokens(...);
  } catch (error) {
    console.warn('Error refunding unused tokens:', error);
  }
}

/**
 * Get sync status based on license + token combination
 */
export function getSyncStatusFromLicense(licenseStatus: LicenseStatus): {
  syncEnabled: boolean;
  offlineModeAllowed: boolean;
  canUpload: boolean;
  reason?: string;
} {
  return licenseStatus === 'active'
    ? {
        syncEnabled: true,
        offlineModeAllowed: true,
        canUpload: true,
      }
    : licenseStatus === 'limited'
      ? {
          syncEnabled: true, // Keep sync enabled during grace
          offlineModeAllowed: true,
          canUpload: true,
          reason: 'Payment pending - sync will be disabled if not resolved',
        }
      : licenseStatus === 'expired'
        ? {
            syncEnabled: false,
            offlineModeAllowed: true,
            canUpload: false,
            reason: 'License expired - upgrade to restore sync',
          }
        : {
            syncEnabled: false,
            offlineModeAllowed: false,
            canUpload: false,
            reason: 'Account suspended',
          };
}
