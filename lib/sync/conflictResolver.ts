/**
 * Conflict Resolution Service
 * Detects and resolves conflicts when changes exist both locally and on Supabase
 */

export type ConflictResolutionStrategy = 'last-write-wins' | 'local-wins' | 'remote-wins' | 'manual';

export interface Conflict {
  changeId: string;
  table: string;
  recordId: string;
  localVersion: {
    values: Record<string, unknown>;
    timestamp: string;
  };
  remoteVersion: {
    values: Record<string, unknown>;
    timestamp: string;
  };
  changedFields: string[];
}

export interface ConflictResolution {
  conflictId: string;
  strategy: ConflictResolutionStrategy;
  resolvedValues: Record<string, unknown>;
  resolvedAt: string;
}

export class ConflictResolver {
  private strategy: ConflictResolutionStrategy;
  private onConflictDetected?: (conflict: Conflict) => Promise<ConflictResolution>;

  constructor(strategy: ConflictResolutionStrategy = 'last-write-wins') {
    this.strategy = strategy;
  }

  /**
   * Set the strategy for resolving conflicts
   */
  setStrategy(strategy: ConflictResolutionStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Set a callback for manual conflict resolution
   */
  setManualResolver(
    callback: (conflict: Conflict) => Promise<ConflictResolution>
  ): void {
    this.onConflictDetected = callback;
  }

  /**
   * Detect if there's a conflict between local and remote versions
   */
  detectConflict(
    changeId: string,
    table: string,
    recordId: string,
    localVersion: { values: Record<string, unknown>; timestamp: string },
    remoteVersion: { values: Record<string, unknown>; timestamp: string }
  ): Conflict | null {
    // Check if versions differ
    const changedFields = this.getChangedFields(localVersion.values, remoteVersion.values);

    if (changedFields.length === 0) {
      // No conflict - versions are identical
      return null;
    }

    // Check timestamps - if remote is newer, we have a conflict
    const remoteTime = new Date(remoteVersion.timestamp).getTime();
    const localTime = new Date(localVersion.timestamp).getTime();

    if (remoteTime > localTime) {
      // Conflict detected
      return {
        changeId,
        table,
        recordId,
        localVersion,
        remoteVersion,
        changedFields,
      };
    }

    return null;
  }

  /**
   * Resolve a conflict using the configured strategy
   */
  async resolve(conflict: Conflict): Promise<ConflictResolution> {
    let resolvedValues: Record<string, unknown> = {};

    switch (this.strategy) {
      case 'last-write-wins':
        // Use the version with the newest timestamp
        resolvedValues = new Date(conflict.remoteVersion.timestamp).getTime() >
          new Date(conflict.localVersion.timestamp).getTime()
          ? conflict.remoteVersion.values
          : conflict.localVersion.values;
        break;

      case 'local-wins':
        // Always use local version
        resolvedValues = conflict.localVersion.values;
        break;

      case 'remote-wins':
        // Always use remote version
        resolvedValues = conflict.remoteVersion.values;
        break;

      case 'manual':
        // Call the manual resolver callback
        if (this.onConflictDetected) {
          return this.onConflictDetected(conflict);
        }
        // Fallback to last-write-wins
        resolvedValues = new Date(conflict.remoteVersion.timestamp).getTime() >
          new Date(conflict.localVersion.timestamp).getTime()
          ? conflict.remoteVersion.values
          : conflict.localVersion.values;
        break;

      default:
        throw new Error(`Unknown conflict resolution strategy: ${this.strategy}`);
    }

    return {
      conflictId: conflict.changeId,
      strategy: this.strategy,
      resolvedValues,
      resolvedAt: new Date().toISOString(),
    };
  }

  /**
   * Merge conflict: for specific fields, prefer one or the other
   */
  resolveWithMerge(
    conflict: Conflict,
    fieldStrategy: Record<string, 'local' | 'remote'>
  ): ConflictResolution {
    const resolvedValues: Record<string, unknown> = { ...conflict.remoteVersion.values };

    // Apply field-specific preferences
    for (const [field, strategy] of Object.entries(fieldStrategy)) {
      if (strategy === 'local' && field in conflict.localVersion.values) {
        resolvedValues[field] = conflict.localVersion.values[field];
      } else if (strategy === 'remote' && field in conflict.remoteVersion.values) {
        resolvedValues[field] = conflict.remoteVersion.values[field];
      }
    }

    return {
      conflictId: conflict.changeId,
      strategy: 'manual',
      resolvedValues,
      resolvedAt: new Date().toISOString(),
    };
  }

  /**
   * Get fields that changed between two versions
   */
  private getChangedFields(local: Record<string, unknown>, remote: Record<string, unknown>): string[] {
    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);
    const changedFields: string[] = [];

    for (const key of allKeys) {
      if (JSON.stringify(local[key]) !== JSON.stringify(remote[key])) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  /**
   * Helper: Check if two objects are equivalent
   */
  isEquivalent(
    a: Record<string, unknown>,
    b: Record<string, unknown>
  ): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }
}

export default ConflictResolver;
