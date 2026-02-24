"use strict";
/**
 * Sync IPC Handlers
 * Handle offline-first sync operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSyncHandlers = registerSyncHandlers;
const electron_1 = require("electron");
const sqlite_1 = require("../db/sqlite");
const uuid_1 = require("uuid");
/**
 * Register all sync handlers
 */
function registerSyncHandlers() {
    console.log('🔄 Registering sync IPC handlers...');
    /**
     * Get current sync status
     */
    electron_1.ipcMain.handle('sync:getStatus', async () => {
        try {
            const db = (0, sqlite_1.getDatabase)();
            // Count pending changes
            const pending = db
                .prepare('SELECT COUNT(*) as count FROM changes_outbox WHERE synced_at IS NULL')
                .get();
            // Count synced changes
            const synced = db
                .prepare('SELECT COUNT(*) as count FROM changes_outbox WHERE synced_at IS NOT NULL')
                .get();
            // Count failed changes
            const failed = db
                .prepare('SELECT COUNT(*) as count FROM changes_outbox WHERE sync_attempts > 3')
                .get();
            // Get last sync time
            const lastSync = db
                .prepare('SELECT sync_at FROM sync_log WHERE status = ? ORDER BY sync_at DESC LIMIT 1')
                .get('completed');
            const status = {
                pending: pending.count || 0,
                synced: synced.count || 0,
                failed: failed.count || 0,
                lastSyncAt: lastSync?.sync_at || null,
            };
            return { success: true, data: status };
        }
        catch (error) {
            console.error('Error getting sync status:', error);
            return { success: false, error: error.message };
        }
    });
    /**
     * Get pending changes
     */
    electron_1.ipcMain.handle('sync:getPendingChanges', async () => {
        try {
            const db = (0, sqlite_1.getDatabase)();
            const changes = db
                .prepare(`
          SELECT id, table_name, operation, record_id, old_values, new_values, created_at, sync_attempts, error
          FROM changes_outbox
          WHERE synced_at IS NULL
          ORDER BY created_at ASC
        `)
                .all();
            // Parse JSON
            const parsed = changes.map((c) => ({
                ...c,
                old_values: c.old_values ? JSON.parse(c.old_values) : null,
                new_values: c.new_values ? JSON.parse(c.new_values) : null,
            }));
            return { success: true, data: parsed };
        }
        catch (error) {
            console.error('Error getting pending changes:', error);
            return { success: false, error: error.message };
        }
    });
    /**
     * Manual sync now (MVP: just queue, actual push happens later)
     */
    electron_1.ipcMain.handle('sync:syncNow', async () => {
        try {
            const db = (0, sqlite_1.getDatabase)();
            const syncId = (0, uuid_1.v4)();
            // Record sync start
            db.prepare(`
        INSERT INTO sync_log (id, status, entries_pushed, entries_pulled, error)
        VALUES (?, 'started', 0, 0, NULL)
      `).run(syncId);
            // For MVP: just prepare changes, don't actually push yet
            const pending = db
                .prepare('SELECT COUNT(*) as count FROM changes_outbox WHERE synced_at IS NULL')
                .get();
            console.log(`🔄 Sync started: ${pending.count} pending changes`);
            // TODO: In Phase 2, implement actual push to Supabase API
            // Simulate sync completion
            await new Promise((resolve) => setTimeout(resolve, 500));
            // Record sync complete
            db.prepare(`
        UPDATE sync_log SET status = 'completed', entries_pushed = ? WHERE id = ?
      `).run(pending.count || 0, syncId);
            const status = await getStatus();
            return {
                success: true,
                data: {
                    message: `Sync complete: ${pending.count} changes queued`,
                    status,
                },
            };
        }
        catch (error) {
            console.error('Error during sync:', error);
            return { success: false, error: error.message };
        }
    });
    /**
     * Clear error on a change
     */
    electron_1.ipcMain.handle('sync:clearError', async (_event, changeId) => {
        try {
            const db = (0, sqlite_1.getDatabase)();
            db.prepare(`
        UPDATE changes_outbox SET error = NULL, sync_attempts = 0 WHERE id = ?
      `).run(changeId);
            return { success: true };
        }
        catch (error) {
            console.error('Error clearing sync error:', error);
            return { success: false, error: error.message };
        }
    });
}
/**
 * Helper: Get current sync status
 */
async function getStatus() {
    try {
        const db = (0, sqlite_1.getDatabase)();
        const pending = db
            .prepare('SELECT COUNT(*) as count FROM changes_outbox WHERE synced_at IS NULL')
            .get();
        const synced = db
            .prepare('SELECT COUNT(*) as count FROM changes_outbox WHERE synced_at IS NOT NULL')
            .get();
        const failed = db
            .prepare('SELECT COUNT(*) as count FROM changes_outbox WHERE sync_attempts > 3')
            .get();
        const lastSync = db
            .prepare('SELECT sync_at FROM sync_log WHERE status = ? ORDER BY sync_at DESC LIMIT 1')
            .get('completed');
        return {
            pending: pending.count || 0,
            synced: synced.count || 0,
            failed: failed.count || 0,
            lastSyncAt: lastSync?.sync_at || null,
        };
    }
    catch (error) {
        console.error('Error getting status:', error);
        return { pending: 0, synced: 0, failed: 0, lastSyncAt: null };
    }
}
//# sourceMappingURL=sync.js.map