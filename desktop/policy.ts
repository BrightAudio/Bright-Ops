/**
 * Policy Engine
 * Single source of truth for all permission enforcement
 * Combines update gate + license gate into unified permission matrix
 */

import { getUpdateGate } from './gates';

// License lifecycle
export type LicenseStatus = 'active' | 'warning' | 'limited' | 'restricted';
export type Plan = 'starter' | 'pro' | 'enterprise';

export type LicenseGate = {
  status: LicenseStatus;
  plan: Plan;
  graceDaysRemaining?: number;
};

// Explicit action vocabulary (used everywhere: IPC + UI + tests)
export type Action =
  | 'sync.run'
  | 'inventory.create'
  | 'jobs.create'
  | 'ai.use'
  | 'ai.speaker_designer'       // Pro+
  | 'ai.lead_discovery'         // Enterprise
  | 'ai.email_generation'       // Enterprise
  | 'leads.use'
  | 'leads.campaign_tracking'   // Enterprise
  | 'goals.use'
  | 'crew.advanced_scheduling'  // Pro+
  | 'analytics.advanced'        // Pro+
  | 'analytics.quarterly_ytd'   // Pro+
  | 'warehouse.multi'           // Pro+
  | 'warehouse.unlimited'       // Enterprise
  | 'api.access'                // Enterprise
  | 'ops.checkout'
  | 'ops.return'
  | 'pullsheets.update'
  | 'export.data';

export type PermissionResult =
  | { allowed: true }
  | {
      allowed: false;
      code: 'UPDATE_REQUIRED' | 'LICENSE_LIMITED' | 'LICENSE_RESTRICTED' | 'PLAN_REQUIRED';
      message: string;
      details: any;
    };

// Global license gate state
let licenseGate: LicenseGate = {
  status: 'active',
  plan: 'starter',
};

export function setLicenseGate(next: LicenseGate) {
  licenseGate = next;
  console.log('🔐 License gate changed:', licenseGate);
}

export function getLicenseGate(): LicenseGate {
  return licenseGate;
}

/**
 * Main permission engine
 * Returns { allowed: true } or { allowed: false, code, message, details }
 */
export function canPerform(action: Action): PermissionResult {
  const update = getUpdateGate();
  const license = getLicenseGate();

  // ✅ Always allowed (even in restricted): returns + exports
  // These are operational safety + data access
  if (action === 'ops.return' || action === 'export.data') {
    return { allowed: true };
  }

  // 🔒 Update gate (ops-safe): blocks sync/create/premium only
  // Checkout, pullsheets, and local ops continue
  if (update.updateRequired) {
    if (
      action === 'sync.run' ||
      action === 'inventory.create' ||
      action === 'jobs.create' ||
      action === 'ai.use' ||
      action === 'leads.use' ||
      action === 'goals.use'
    ) {
      return {
        allowed: false,
        code: 'UPDATE_REQUIRED',
        message: 'Update required to use sync, create, and premium features.',
        details: update,
      };
    }
  }

  // 🔒 License gate: progressive restriction by status
  
  // Days 0–7: warning (still allowed, plan gates still apply later)
  if (license.status === 'warning' || license.status === 'active') {
    // Plan gating happens below, but operations allowed
  }

  // Days 8–14: limited => sync disabled only (ops continue)
  if (license.status === 'limited') {
    if (action === 'sync.run') {
      return {
        allowed: false,
        code: 'LICENSE_LIMITED',
        message: 'Sync disabled while payment is past due (grace days 8–14).',
        details: license,
      };
    }
    // All other actions allowed during limited
  }

  // Days 15+: restricted => read-only + returns only
  // No new data, no ops edits, no premium features
  if (license.status === 'restricted') {
    if (
      action === 'sync.run' ||
      action === 'inventory.create' ||
      action === 'jobs.create' ||
      action === 'ai.use' ||
      action === 'leads.use' ||
      action === 'goals.use' ||
      action === 'ops.checkout' ||
      action === 'pullsheets.update'
    ) {
      return {
        allowed: false,
        code: 'LICENSE_RESTRICTED',
        message:
          'Account in read-only mode due to non-payment (15+ days). Returns and exports allowed.',
        details: license,
      };
    }
  }

  // 🔒 Plan gating: feature access by subscription level
  if (license.plan === 'starter') {
    // Starter has no advanced features
    const starterBlocked = [
      'ai.use',
      'ai.speaker_designer',
      'ai.lead_discovery',
      'ai.email_generation',
      'leads.use',
      'leads.campaign_tracking',
      'goals.use',
      'crew.advanced_scheduling',
      'analytics.advanced',
      'analytics.quarterly_ytd',
      'warehouse.multi',
      'warehouse.unlimited',
      'api.access',
    ];

    if (starterBlocked.includes(action)) {
      return {
        allowed: false,
        code: 'PLAN_REQUIRED',
        message: `This feature requires Pro or Enterprise plan.`,
        details: { requiredPlan: 'pro', currentPlan: 'starter', action },
      };
    }
  }

  if (license.plan === 'pro') {
    // Pro does not have Enterprise-only features
    const proBlocked = [
      'ai.lead_discovery',
      'ai.email_generation',
      'leads.campaign_tracking',
      'warehouse.unlimited',
      'api.access',
    ];

    if (proBlocked.includes(action)) {
      return {
        allowed: false,
        code: 'PLAN_REQUIRED',
        message: `This feature is Enterprise-only. Upgrade to unlock.`,
        details: { requiredPlan: 'enterprise', currentPlan: 'pro', action },
      };
    }
  }

  // Enterprise has all features ✅

  return { allowed: true };
}

/**
 * Enforcement function: throw if not allowed
 * Use in all IPC handlers
 */
export function assertAllowed(action: Action) {
  const res = canPerform(action);
  if (!res.allowed) {
    // Narrow type to denied result
    const denied = res as Exclude<PermissionResult, { allowed: true }>;
    const err: any = new Error(denied.message);
    err.code = denied.code;
    err.details = denied.details;
    throw err;
  }
}

/**
 * Get full policy snapshot for renderer
 * Useful for UI to build comprehensive state
 */
export function getPolicySnapshot() {
  return {
    update: getUpdateGate(),
    license: getLicenseGate(),
  };
}
