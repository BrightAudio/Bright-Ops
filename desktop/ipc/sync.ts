/**
 * Sync IPC Handlers
 * Handle offline-first sync operations
 */

import { ipcMain } from 'electron';
import { getDatabase } from '../db/sqlite';
import { v4 as uuidv4 } from 'uuid';
import OutboxSyncService from '../../lib/sync/outboxSync';

export type SyncStatus = {
  pending: number;
  synced: number;
  failed: number;
  lastSyncAt: string | null;
};

// Global sync service instance
let syncService: OutboxSyncService | null = null;
let authToken: string | null = null;

/**
 * Initialize sync service with auth token
 */
export function setSyncAuthToken(token: string): void {
  authToken = token;
  if (syncService) {
    syncService.setAuthToken(token);
  }
  console.log('✅ Sync auth token updated');
}

/**
 * Get or create sync service instance
 */
function getSyncService(): OutboxSyncService {
  if (!syncService) {
    syncService = new OutboxSyncService({
      authToken: authToken || undefined,
      apiUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sync/changes`,
    });

    const db = getDatabase();
    syncService.setDatabase(db as any);
  }
  return syncService;
}

/**
 * Register all sync handlers
 */
export function registerSyncHandlers(): void {
  console.log('🔄 Registering sync IPC handlers...');

  // Start auto-sync when handlers are registered
  const syncSvc = getSyncService();
  syncSvc.startAutoSync();
  console.log('✅ Auto-sync enabled');

  /**
   * Set auth token for sync service
   */
  ipcMain.handle('sync:setAuthToken', async (_event, token: string) => {
    try {
      setSyncAuthToken(token);
      return { success: true };
    } catch (error) {
      console.error('Error setting auth token:', error);
      return { success: false, error: (error as any).message };
    }
  });

  /**
   * Get current sync status
   */
  ipcMain.handle('sync:getStatus', async () => {
    try {
      const db = getDatabase();

      // Count pending changes
      const pending = db
        .prepare('SELECT COUNT(*) as count FROM changes_outbox WHERE synced_at IS NULL')
        .get() as any;

      // Count synced changes
      const synced = db
        .prepare('SELECT COUNT(*) as count FROM changes_outbox WHERE synced_at IS NOT NULL')
        .get() as any;

      // Count failed changes
      const failed = db
        .prepare('SELECT COUNT(*) as count FROM changes_outbox WHERE sync_attempts > 3')
        .get() as any;

      // Get last sync time
      const lastSync = db
        .prepare('SELECT sync_at FROM sync_log WHERE status = ? ORDER BY sync_at DESC LIMIT 1')
        .get('completed') as any;

      const status: SyncStatus = {
        pending: pending.count || 0,
        synced: synced.count || 0,
        failed: failed.count || 0,
        lastSyncAt: lastSync?.sync_at || null,
      };

      return { success: true, data: status };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return { success: false, error: (error as any).message };
    }
  });

  /**
   * Get pending changes
   */
  ipcMain.handle('sync:getPendingChanges', async () => {
    try {
      const db = getDatabase();

      const changes = db
        .prepare(`
          SELECT id, table_name, operation, record_id, old_values, new_values, created_at, sync_attempts, error
          FROM changes_outbox
          WHERE synced_at IS NULL
          ORDER BY created_at ASC
        `)
        .all() as any[];

      // Parse JSON
      const parsed = changes.map((c) => ({
        ...c,
        old_values: c.old_values ? JSON.parse(c.old_values) : null,
        new_values: c.new_values ? JSON.parse(c.new_values) : null,
      }));

      return { success: true, data: parsed };
    } catch (error) {
      console.error('Error getting pending changes:', error);
      return { success: false, error: (error as any).message };
    }
  });

  /**
   * Manual sync now - Actually syncs to Supabase
   */
  ipcMain.handle('sync:syncNow', async () => {
    try {
      const syncSvc = getSyncService();

      if (!authToken) {
        console.warn('⚠️ Sync attempted without auth token - will fail');
      }

      const db = getDatabase();
      const syncId = uuidv4();

      // Record sync start
      db.prepare(`
        INSERT INTO sync_log (id, status, entries_pushed, entries_pulled, error)
        VALUES (?, 'started', 0, 0, NULL)
      `).run(syncId);

      console.log('🔄 Starting sync to Supabase...');

      // Perform actual sync
      const result = await syncSvc.syncPending();

      console.log(
        `✅ Sync complete: ${result.synced} synced, ${result.failed} failed`
      );

      // Record sync completion
      db.prepare(`
        UPDATE sync_log SET status = 'completed', entries_pushed = ?, error = ? WHERE id = ?
      `).run(
        result.synced,
        result.failed > 0 ? JSON.stringify(result.errors) : null,
        syncId
      );

      const status = await getStatus();

      return {
        success: result.failed === 0,
        data: {
          message: `Sync complete: ${result.synced} synced, ${result.failed} failed`,
          status,
          details: result,
        },
      };
    } catch (error) {
      console.error('Error during sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  /**
   * Clear error on a change
   */
  ipcMain.handle('sync:clearError', async (_event, changeId: string) => {
    try {
      const db = getDatabase();

      db.prepare(`
        UPDATE changes_outbox SET error = NULL, sync_attempts = 0 WHERE id = ?
      `).run(changeId);

      return { success: true };
    } catch (error) {
      console.error('Error clearing sync error:', error);
      return { success: false, error: (error as any).message };
    }
  });
}

/**
 * Helper: Get current sync status
 */
async function getStatus(): Promise<SyncStatus> {
  try {
    const db = getDatabase();

    const pending = db
      .prepare('SELECT COUNT(*) as count FROM changes_outbox WHERE synced_at IS NULL')
      .get() as any;

    const synced = db
      .prepare('SELECT COUNT(*) as count FROM changes_outbox WHERE synced_at IS NOT NULL')
      .get() as any;

    const failed = db
      .prepare('SELECT COUNT(*) as count FROM changes_outbox WHERE sync_attempts > 3')
      .get() as any;

    const lastSync = db
      .prepare('SELECT sync_at FROM sync_log WHERE status = ? ORDER BY sync_at DESC LIMIT 1')
      .get('completed') as any;

    return {
      pending: pending.count || 0,
      synced: synced.count || 0,
      failed: failed.count || 0,
      lastSyncAt: lastSync?.sync_at || null,
    };
  } catch (error) {
    console.error('Error getting status:', error);
    return { pending: 0, synced: 0, failed: 0, lastSyncAt: null };
  }
}
