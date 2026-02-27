/**
 * License Permission Gates
 * Centralized permission checking logic (used by both desktop IPC and web routes)
 */

export type LicenseStatus = 'active' | 'warning' | 'limited' | 'restricted' | 'unknown';
export type ActionType = 'sync' | 'create_job' | 'add_inventory' | 'view_inventory' | 'export_data';

export interface LicensePermissions {
  status: LicenseStatus;
  sync_enabled: boolean;
  can_create_jobs: boolean;
  can_add_inventory: boolean;
}

/**
 * Check if user can perform an action
 */
export function canPerform(
  permissions: LicensePermissions,
  action: ActionType
): boolean {
  const { status, sync_enabled, can_create_jobs, can_add_inventory } = permissions;

  // Restricted mode: almost nothing except view and export
  if (status === 'restricted') {
    if (action === 'view_inventory') return true;
    if (action === 'export_data') return true;
    return false;
  }

  // Limited mode: no sync, but other operations allowed
  if (status === 'limited') {
    if (action === 'sync') return false;
    if (action === 'view_inventory') return true;
    if (action === 'export_data') return true;
    return true;
  }

  // Active and Warning: full access except warnings might show
  if (status === 'active' || status === 'warning') {
    if (action === 'sync') return sync_enabled;
    if (action === 'create_job') return can_create_jobs;
    if (action === 'add_inventory') return can_add_inventory;
    return true;
  }

  return false;
}

/**
 * Get human-readable reason why action is blocked
 */
export function getBlockReason(
  permissions: LicensePermissions,
  action: ActionType
): string | null {
  if (canPerform(permissions, action)) {
    return null;
  }

  const { status } = permissions;

  if (status === 'restricted') {
    if (action === 'sync') return 'Account restricted due to payment issue. Please contact support.';
    if (action === 'create_job') return 'Creating jobs is disabled. Please renew your subscription.';
    if (action === 'add_inventory') return 'Adding inventory is disabled. Please renew your subscription.';
    return 'This action is not available in your current license status.';
  }

  if (status === 'limited') {
    if (action === 'sync') return 'Sync is temporarily paused due to a billing issue.';
  }

  return 'This action is not available with your current license.';
}

/**
 * Convert permission object to feature flags
 */
export function permissionsToFeatures(permissions: LicensePermissions): Record<string, boolean> {
  return {
    can_sync: canPerform(permissions, 'sync'),
    can_create_jobs: canPerform(permissions, 'create_job'),
    can_add_inventory: canPerform(permissions, 'add_inventory'),
    can_view_inventory: canPerform(permissions, 'view_inventory'),
    can_export_data: canPerform(permissions, 'export_data'),
  };
}

/**
 * Get UI state for license status badge
 */
export interface LicenseUIState {
  icon: 'check' | 'alert' | 'warning' | 'lock';
  color: 'green' | 'amber' | 'orange' | 'red';
  label: string;
  description: string;
}

export function getLicenseUIState(status: LicenseStatus, plan: string): LicenseUIState {
  switch (status) {
    case 'active':
      return {
        icon: 'check',
        color: 'green',
        label: 'License Active',
        description: `${plan} plan - Fully functional`,
      };
    case 'warning':
      return {
        icon: 'alert',
        color: 'amber',
        label: 'Payment Issue',
        description: 'Please update your billing within 7 days',
      };
    case 'limited':
      return {
        icon: 'warning',
        color: 'orange',
        label: 'Limited Access',
        description: 'Sync disabled - local work only for 7 more days',
      };
    case 'restricted':
      return {
        icon: 'lock',
        color: 'red',
        label: 'Account Restricted',
        description: 'Renew subscription to restore full access',
      };
    default:
      return {
        icon: 'lock',
        color: 'red',
        label: 'Unknown Status',
        description: 'Please contact support',
      };
  }
}

/**
 * Check if license renewal is urgent
 */
export function isRenewalUrgent(status: LicenseStatus, daysRemaining: number): boolean {
  if (status === 'restricted') return true; // Always urgent
  if (status === 'limited') return daysRemaining <= 3; // Critical
  if (status === 'warning') return daysRemaining <= 2; // Soon
  return false;
}
