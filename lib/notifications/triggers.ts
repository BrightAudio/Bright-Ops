/**
 * Notification Triggers
 * Determines when and how to send notifications based on license status
 */

import { createClient } from '@supabase/supabase-js';
import { 
  sendLicenseExpiringWarning,
  sendLicenseExpiringUrgent,
  sendPaymentFailed,
  sendOfflineGraceEnding,
  sendLicenseUpgraded,
  sendDeviceLimitReached,
} from './sendgridService';

// Initialize Supabase admin client with service key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

interface OrganizationLicense {
  id: string;
  organization_id: string;
  plan: string;
  status: 'active' | 'warning' | 'limited' | 'restricted';
  expires_at: string;
  payment_status: 'success' | 'failed' | 'pending';
  last_payment_failure: string | null;
  failed_payment_count: number;
  offline_grace_started_at: string | null;
  previous_plan?: string;
}

interface Organization {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  owner_id: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
}

/**
 * Check license expiration and send warnings
 */
export async function checkLicenseExpiration() {
  try {
    const { data: licenses, error } = await supabaseAdmin
      .from('licenses')
      .select('*, organizations(name, email, owner_id)')
      .in('status', ['active', 'warning'])
      .lt('expires_at', new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString()); // Next 8 days

    if (error) throw error;

    const now = new Date();
    const results = [];

    for (const license of licenses) {
      const expiresAt = new Date(license.expires_at);
      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Skip if already notified recently
      const { data: sentNotifications } = await supabaseAdmin
        .from('notification_logs')
        .select('*')
        .eq('license_id', license.id)
        .eq('type', daysRemaining <= 1 ? 'license_expiring_urgent' : 'license_expiring_warning')
        .gt('created_at', new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString());

      if (sentNotifications && sentNotifications.length > 0) {
        console.log(`⏭️ Already notified for license ${license.id}, skipping`);
        continue;
      }

      // Get organization owner email
      const { data: ownerUser } = await supabaseAdmin
        .from('users')
        .select('email, full_name')
        .eq('id', license.organizations.owner_id)
        .single();

      if (!ownerUser) {
        console.warn(`⚠️ Owner not found for organization ${license.organization_id}`);
        continue;
      }

      // Send appropriate notification
      if (daysRemaining <= 1) {
        await sendLicenseExpiringUrgent({
          to: ownerUser.email,
          organizationId: license.organization_id,
          userId: license.organizations.owner_id,
          userName: ownerUser.full_name,
          organizationName: license.organizations.name,
          currentPlan: license.plan,
          expirationDate: expiresAt.toLocaleDateString(),
        });

        results.push({ type: 'urgent', organizationId: license.organization_id, status: 'sent' });
      } else if (daysRemaining <= 7) {
        await sendLicenseExpiringWarning({
          to: ownerUser.email,
          organizationId: license.organization_id,
          userId: license.organizations.owner_id,
          userName: ownerUser.full_name,
          organizationName: license.organizations.name,
          daysRemaining,
          currentPlan: license.plan,
          expirationDate: expiresAt.toLocaleDateString(),
        });

        results.push({ type: 'warning', organizationId: license.organization_id, status: 'sent' });
      }

      // Log notification
      await supabaseAdmin.from('notification_logs').insert({
        license_id: license.id,
        organization_id: license.organization_id,
        user_id: license.organizations.owner_id,
        type: daysRemaining <= 1 ? 'license_expiring_urgent' : 'license_expiring_warning',
        recipient_email: ownerUser.email,
        status: 'sent',
      });
    }

    console.log(`✅ License expiration check completed: ${results.length} notifications sent`);
    return results;
  } catch (error) {
    console.error('❌ Error checking license expiration:', error);
    throw error;
  }
}

/**
 * Check payment failures and send alerts
 */
export async function checkPaymentFailures() {
  try {
    const { data: licenses, error } = await supabaseAdmin
      .from('licenses')
      .select('*, organizations(name, email, owner_id)')
      .eq('payment_status', 'failed')
      .not('last_payment_failure', 'is', null);

    if (error) throw error;

    const results = [];

    for (const license of licenses) {
      // Check if already notified
      const { data: sentNotifications } = await supabaseAdmin
        .from('notification_logs')
        .select('*')
        .eq('license_id', license.id)
        .eq('type', 'payment_failed')
        .gt('created_at', new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString());

      if (sentNotifications && sentNotifications.length > 0) {
        console.log(`⏭️ Already notified about payment failure for license ${license.id}`);
        continue;
      }

      const { data: ownerUser } = await supabaseAdmin
        .from('users')
        .select('email, full_name')
        .eq('id', license.organizations.owner_id)
        .single();

      if (!ownerUser) continue;

      // Determine failure reason
      let failureReason = 'Your payment method was declined.';
      if (license.failed_payment_count > 2) {
        failureReason = 'Payment failed multiple times. Address possibly blocked.';
      }

      await sendPaymentFailed({
        to: ownerUser.email,
        organizationId: license.organization_id,
        userId: license.organizations.owner_id,
        userName: ownerUser.full_name,
        organizationName: license.organizations.name,
        failureReason,
        currentPlan: license.plan,
      });

      // Log notification
      await supabaseAdmin.from('notification_logs').insert({
        license_id: license.id,
        organization_id: license.organization_id,
        user_id: license.organizations.owner_id,
        type: 'payment_failed',
        recipient_email: ownerUser.email,
        status: 'sent',
      });

      results.push({ organizationId: license.organization_id, status: 'sent' });
    }

    console.log(`✅ Payment failure check completed: ${results.length} notifications sent`);
    return results;
  } catch (error) {
    console.error('❌ Error checking payment failures:', error);
    throw error;
  }
}

/**
 * Check offline grace period ending
 */
export async function checkGracePeriodEnding() {
  try {
    const { data: licenses, error } = await supabaseAdmin
      .from('licenses')
      .select('*, organizations(name, email, owner_id)')
      .eq('status', 'limited')
      .not('offline_grace_started_at', 'is', null);

    if (error) throw error;

    const results = [];
    const now = new Date();

    for (const license of licenses) {
      const graceStarted = new Date(license.offline_grace_started_at);
      const graceEndsAt = new Date(graceStarted.getTime() + 7 * 24 * 60 * 60 * 1000);
      const hoursRemaining = Math.ceil((graceEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60));

      // Only notify if less than 24 hours remaining
      if (hoursRemaining > 24) continue;

      // Check if already notified
      const { data: sentNotifications } = await supabaseAdmin
        .from('notification_logs')
        .select('*')
        .eq('license_id', license.id)
        .eq('type', 'grace_period_ending')
        .gt('created_at', new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString());

      if (sentNotifications && sentNotifications.length > 0) {
        continue;
      }

      const { data: ownerUser } = await supabaseAdmin
        .from('users')
        .select('email, full_name')
        .eq('id', license.organizations.owner_id)
        .single();

      if (!ownerUser) continue;

      await sendOfflineGraceEnding({
        to: ownerUser.email,
        organizationId: license.organization_id,
        userId: license.organizations.owner_id,
        userName: ownerUser.full_name,
        organizationName: license.organizations.name,
        hoursRemaining: Math.max(1, hoursRemaining),
      });

      // Log notification
      await supabaseAdmin.from('notification_logs').insert({
        license_id: license.id,
        organization_id: license.organization_id,
        user_id: license.organizations.owner_id,
        type: 'grace_period_ending',
        recipient_email: ownerUser.email,
        status: 'sent',
      });

      results.push({ organizationId: license.organization_id, status: 'sent' });
    }

    console.log(`✅ Grace period check completed: ${results.length} notifications sent`);
    return results;
  } catch (error) {
    console.error('❌ Error checking grace period:', error);
    throw error;
  }
}

/**
 * Send notification when license is upgraded
 */
export async function notifyLicenseUpgrade(organizationId: string, newPlan: string, previousPlan: string) {
  try {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name, owner_id')
      .eq('id', organizationId)
      .single();

    if (!org) throw new Error(`Organization ${organizationId} not found`);

    const { data: owner } = await supabaseAdmin
      .from('users')
      .select('email, full_name')
      .eq('id', org.owner_id)
      .single();

    if (!owner) throw new Error(`Owner not found for organization ${organizationId}`);

    // Get new features and allocations based on plan
    const planDetails: Record<string, { features: string[]; devices: number; tokens: number }> = {
      pro: {
        features: [
          '✨ Advanced financial analytics',
          '📊 Profit margin tracking',
          '🤖 AI Speaker Designer',
          '🎮 Goals & Quests system',
          '📈 Quarterly & YTD reports',
          '3️⃣ 3 device licenses',
        ],
        devices: 3,
        tokens: 1000,
      },
      enterprise: {
        features: [
          '✨ Everything in Pro +',
          '👥 Leads CRM',
          '🤖 AI Lead Discovery',
          '📧 AI Email Generation',
          '🎯 Campaign tracking',
          '🔌 API access',
          '🏢 Unlimited warehouses',
          '🔟 10 device licenses',
        ],
        devices: 10,
        tokens: 15000,
      },
    };

    const details = planDetails[newPlan.toLowerCase()] || { features: [], devices: 1, tokens: 250 };

    await sendLicenseUpgraded({
      to: owner.email,
      organizationId,
      userId: org.owner_id,
      userName: owner.full_name,
      organizationName: org.name,
      previousPlan,
      newPlan,
      newFeatures: details.features,
      deviceAllocation: details.devices,
      tokenAllocation: details.tokens,
    });

    // Log notification
    const { data: license } = await supabaseAdmin
      .from('licenses')
      .select('id')
      .eq('organization_id', organizationId)
      .single();

    if (license) {
      await supabaseAdmin.from('notification_logs').insert({
        license_id: license.id,
        organization_id: organizationId,
        user_id: org.owner_id,
        type: 'license_upgraded',
        recipient_email: owner.email,
        status: 'sent',
      });
    }

    console.log(`✅ Upgrade notification sent to ${owner.email}`);
  } catch (error) {
    console.error('❌ Error sending upgrade notification:', error);
    throw error;
  }
}

/**
 * Send notification when device limit is reached
 */
export async function notifyDeviceLimitReached(
  organizationId: string,
  currentPlan: string,
  deviceLimit: number,
  attemptedDevice: string
) {
  try {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name, owner_id')
      .eq('id', organizationId)
      .single();

    if (!org) throw new Error(`Organization ${organizationId} not found`);

    const { data: owner } = await supabaseAdmin
      .from('users')
      .select('email, full_name')
      .eq('id', org.owner_id)
      .single();

    if (!owner) throw new Error(`Owner not found for organization ${organizationId}`);

    // Check if already notified
    const { data: sentNotifications } = await supabaseAdmin
      .from('notification_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('type', 'device_limit_reached')
      .gt('created_at', new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString());

    if (sentNotifications && sentNotifications.length > 0) {
      console.log(`⏭️ Already notified about device limit for ${organizationId}`);
      return;
    }

    await sendDeviceLimitReached({
      to: owner.email,
      organizationId,
      userId: org.owner_id,
      userName: owner.full_name,
      organizationName: org.name,
      currentPlan,
      deviceLimit,
      attemptedDevice,
    });

    // Log notification
    const { data: license } = await supabaseAdmin
      .from('licenses')
      .select('id')
      .eq('organization_id', organizationId)
      .single();

    if (license) {
      await supabaseAdmin.from('notification_logs').insert({
        license_id: license.id,
        organization_id: organizationId,
        user_id: org.owner_id,
        type: 'device_limit_reached',
        recipient_email: owner.email,
        status: 'sent',
      });
    }

    console.log(`✅ Device limit notification sent to ${owner.email}`);
  } catch (error) {
    console.error('❌ Error sending device limit notification:', error);
    throw error;
  }
}
