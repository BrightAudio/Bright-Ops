/**
 * Outbox Pattern Types
 * Used for capturing all changes for offline-first sync
 */

export type ChangeOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export type OutboxEntry = {
  id: string;
  table_name: string;
  operation: ChangeOperation;
  record_id: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  created_at: string;
  synced_at: string | null;
  sync_attempts: number;
  error: string | null;
};

export type SyncStatus = {
  pending: number;
  synced: number;
  failed: number;
  lastSyncAt: string | null;
};

/**
 * Helper to create outbox entries
 */
export function createOutboxEntry(
  tableName: string,
  operation: ChangeOperation,
  recordId: string,
  oldValues: Record<string, any> | null = null,
  newValues: Record<string, any> | null = null
): Omit<OutboxEntry, 'id' | 'created_at' | 'synced_at' | 'sync_attempts' | 'error'> {
  return {
    table_name: tableName,
    operation,
    record_id: recordId,
    old_values: oldValues,
    new_values: newValues,
  };
}
