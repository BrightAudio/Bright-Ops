/**
 * Permission Gates for Main Process
 * Centralized enforcement of update gate and license state
 */

export type UpdateGate = {
  updateRequired: boolean;
  minVersion?: string;
};

// Update gate state
let updateGate: UpdateGate = {
  updateRequired: false,
};

export function setUpdateGate(next: UpdateGate) {
  updateGate = next;
  console.log('🔐 Update gate changed:', updateGate);
}

export function getUpdateGate(): UpdateGate {
  return updateGate;
}

/**
 * Generic enforcement: use for paid actions (sync, create, checkout, etc.)
 * Raises error if update is required
 */
export function assertNotUpdateBlocked(actionName: string) {
  if (updateGate.updateRequired) {
    const err: any = new Error(
      `Update required. Action '${actionName}' is disabled until you update to version ${updateGate.minVersion || 'latest'}.`
    );
    err.code = 'UPDATE_REQUIRED';
    err.details = updateGate;
    throw err;
  }
}
