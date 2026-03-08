import sgMail from '@sendgrid/mail';
import { render } from '@react-email/render';
import LicenseExpiringWarning from '@/app/email/LicenseExpiringWarning';
import LicenseExpiringUrgent from '@/app/email/LicenseExpiringUrgent';
import PaymentFailed from '@/app/email/PaymentFailed';
import OfflineGraceEnding from '@/app/email/OfflineGraceEnding';
import LicenseUpgraded from '@/app/email/LicenseUpgraded';
import DeviceLimitReached from '@/app/email/DeviceLimitReached';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'notifications@brightops.com';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@brightops.com';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface NotificationOptions {
  to: string;
  organizationId: string;
  userId: string;
}

/**
 * Send license expiration warning (7 days)
 */
export async function sendLicenseExpiringWarning(
  options: NotificationOptions & {
    userName: string;
    organizationName: string;
    daysRemaining: number;
    currentPlan: string;
    expirationDate: string;
  }
) {
  try {
    const html = render(
      <LicenseExpiringWarning
        userName={options.userName}
        organizationName={options.organizationName}
        daysRemaining={options.daysRemaining}
        currentPlan={options.currentPlan}
        expirationDate={options.expirationDate}
        upgradeUrl={`${process.env.NEXT_PUBLIC_APP_URL}/account/billing?action=renew`}
      />
    );

    await sgMail.send({
      to: options.to,
      from: FROM_EMAIL,
      subject: `⏰ Your ${options.currentPlan} plan expires in ${options.daysRemaining} days`,
      html,
      trackingSettings: {
        clickTracking: { enabled: true },
        openTracking: { enabled: true },
      },
      categories: ['license-expiring', 'warning'],
      customArgs: {
        organization_id: options.organizationId,
        user_id: options.userId,
        notification_type: 'license_expiring_warning',
      },
    });

    console.log(`✅ License expiring warning sent to ${options.to}`);
  } catch (error) {
    console.error('❌ Failed to send license expiring warning:', error);
    throw error;
  }
}

/**
 * Send urgent license expiration notice (1 day)
 */
export async function sendLicenseExpiringUrgent(
  options: NotificationOptions & {
    userName: string;
    organizationName: string;
    currentPlan: string;
    expirationDate: string;
  }
) {
  try {
    const html = render(
      <LicenseExpiringUrgent
        userName={options.userName}
        organizationName={options.organizationName}
        currentPlan={options.currentPlan}
        expirationDate={options.expirationDate}
        renewUrl={`${process.env.NEXT_PUBLIC_APP_URL}/account/billing?action=renew`}
      />
    );

    await sgMail.send({
      to: options.to,
      from: FROM_EMAIL,
      subject: `🚨 URGENT: Your ${options.currentPlan} plan expires TOMORROW`,
      html,
      trackingSettings: {
        clickTracking: { enabled: true },
        openTracking: { enabled: true },
      },
      categories: ['license-expiring', 'urgent'],
      customArgs: {
        organization_id: options.organizationId,
        user_id: options.userId,
        notification_type: 'license_expiring_urgent',
      },
    });

    console.log(`✅ Urgent license expiring notice sent to ${options.to}`);
  } catch (error) {
    console.error('❌ Failed to send urgent license expiring notice:', error);
    throw error;
  }
}

/**
 * Send payment failed notification
 */
export async function sendPaymentFailed(
  options: NotificationOptions & {
    userName: string;
    organizationName: string;
    failureReason: string;
    currentPlan: string;
  }
) {
  try {
    const html = render(
      <PaymentFailed
        userName={options.userName}
        organizationName={options.organizationName}
        failureReason={options.failureReason}
        currentPlan={options.currentPlan}
        updatePaymentUrl={`${process.env.NEXT_PUBLIC_APP_URL}/account/billing?action=update_payment`}
        supportEmail={SUPPORT_EMAIL}
      />
    );

    await sgMail.send({
      to: options.to,
      from: FROM_EMAIL,
      subject: `❌ Payment Failed for ${options.organizationName}`,
      html,
      trackingSettings: {
        clickTracking: { enabled: true },
        openTracking: { enabled: true },
      },
      categories: ['payment', 'failed'],
      customArgs: {
        organization_id: options.organizationId,
        user_id: options.userId,
        notification_type: 'payment_failed',
      },
    });

    console.log(`✅ Payment failed notification sent to ${options.to}`);
  } catch (error) {
    console.error('❌ Failed to send payment failed notification:', error);
    throw error;
  }
}

/**
 * Send offline grace period ending notification
 */
export async function sendOfflineGraceEnding(
  options: NotificationOptions & {
    userName: string;
    organizationName: string;
    hoursRemaining: number;
  }
) {
  try {
    const html = render(
      <OfflineGraceEnding
        userName={options.userName}
        organizationName={options.organizationName}
        hoursRemaining={options.hoursRemaining}
        renewUrl={`${process.env.NEXT_PUBLIC_APP_URL}/account/billing?action=renew`}
      />
    );

    await sgMail.send({
      to: options.to,
      from: FROM_EMAIL,
      subject: `⏱️ Go Online Within ${options.hoursRemaining} Hours - ${options.organizationName}`,
      html,
      trackingSettings: {
        clickTracking: { enabled: true },
        openTracking: { enabled: true },
      },
      categories: ['grace-period', 'urgent'],
      customArgs: {
        organization_id: options.organizationId,
        user_id: options.userId,
        notification_type: 'grace_period_ending',
      },
    });

    console.log(`✅ Grace period ending notification sent to ${options.to}`);
  } catch (error) {
    console.error('❌ Failed to send grace period ending notification:', error);
    throw error;
  }
}

/**
 * Send license upgraded celebration
 */
export async function sendLicenseUpgraded(
  options: NotificationOptions & {
    userName: string;
    organizationName: string;
    previousPlan: string;
    newPlan: string;
    newFeatures: string[];
    deviceAllocation: number;
    tokenAllocation: number;
  }
) {
  try {
    const html = render(
      <LicenseUpgraded
        userName={options.userName}
        organizationName={options.organizationName}
        previousPlan={options.previousPlan}
        newPlan={options.newPlan}
        newFeatures={options.newFeatures}
        deviceAllocation={options.deviceAllocation}
        tokenAllocation={options.tokenAllocation}
        dashboardUrl={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
      />
    );

    await sgMail.send({
      to: options.to,
      from: FROM_EMAIL,
      subject: `🎉 Welcome to ${options.newPlan}! - ${options.organizationName}`,
      html,
      trackingSettings: {
        clickTracking: { enabled: true },
        openTracking: { enabled: true },
      },
      categories: ['upgrade', 'success'],
      customArgs: {
        organization_id: options.organizationId,
        user_id: options.userId,
        notification_type: 'license_upgraded',
      },
    });

    console.log(`✅ License upgraded notification sent to ${options.to}`);
  } catch (error) {
    console.error('❌ Failed to send license upgraded notification:', error);
    throw error;
  }
}

/**
 * Send device limit reached notification
 */
export async function sendDeviceLimitReached(
  options: NotificationOptions & {
    userName: string;
    organizationName: string;
    currentPlan: string;
    deviceLimit: number;
    attemptedDevice: string;
  }
) {
  try {
    const html = render(
      <DeviceLimitReached
        userName={options.userName}
        organizationName={options.organizationName}
        currentPlan={options.currentPlan}
        deviceLimit={options.deviceLimit}
        attemptedDevice={options.attemptedDevice}
        manageDevicesUrl={`${process.env.NEXT_PUBLIC_APP_URL}/devices`}
        upgradeUrl={`${process.env.NEXT_PUBLIC_APP_URL}/account/billing?action=upgrade`}
      />
    );

    await sgMail.send({
      to: options.to,
      from: FROM_EMAIL,
      subject: `⚠️ Device Limit Reached - ${options.organizationName}`,
      html,
      trackingSettings: {
        clickTracking: { enabled: true },
        openTracking: { enabled: true },
      },
      categories: ['device-limit', 'warning'],
      customArgs: {
        organization_id: options.organizationId,
        user_id: options.userId,
        notification_type: 'device_limit_reached',
      },
    });

    console.log(`✅ Device limit reached notification sent to ${options.to}`);
  } catch (error) {
    console.error('❌ Failed to send device limit reached notification:', error);
    throw error;
  }
}

/**
 * Batch send notifications
 */
export async function sendBatch(notifications: Array<{
  type:
    | 'license_expiring_warning'
    | 'license_expiring_urgent'
    | 'payment_failed'
    | 'grace_period_ending'
    | 'license_upgraded'
    | 'device_limit_reached';
  options: any;
}>) {
  const results = [];

  for (const notification of notifications) {
    try {
      switch (notification.type) {
        case 'license_expiring_warning':
          await sendLicenseExpiringWarning(notification.options);
          results.push({ type: notification.type, status: 'sent' });
          break;
        case 'license_expiring_urgent':
          await sendLicenseExpiringUrgent(notification.options);
          results.push({ type: notification.type, status: 'sent' });
          break;
        case 'payment_failed':
          await sendPaymentFailed(notification.options);
          results.push({ type: notification.type, status: 'sent' });
          break;
        case 'grace_period_ending':
          await sendOfflineGraceEnding(notification.options);
          results.push({ type: notification.type, status: 'sent' });
          break;
        case 'license_upgraded':
          await sendLicenseUpgraded(notification.options);
          results.push({ type: notification.type, status: 'sent' });
          break;
        case 'device_limit_reached':
          await sendDeviceLimitReached(notification.options);
          results.push({ type: notification.type, status: 'sent' });
          break;
      }
    } catch (error) {
      results.push({ type: notification.type, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return results;
}
