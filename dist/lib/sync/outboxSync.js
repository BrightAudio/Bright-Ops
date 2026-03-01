"use strict";
/**
 * Sync Service - Manages syncing of offline changes to Supabase
 * Used by the Electron desktop app to sync changes when online
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxSyncService = void 0;
const networkMonitor_1 = require("./networkMonitor");
class OutboxSyncService {
    constructor(options = {}) {
        this.networkMonitor = (0, networkMonitor_1.getNetworkMonitor)();
        this.networkUnsubscribe = null;
        this.batchSize = options.batchSize || 100;
        this.maxRetries = options.maxRetries || 3;
        this.baseDelayMs = options.baseDelayMs || 1000;
        this.authToken = options.authToken || '';
        this.apiUrl = options.apiUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sync/changes`;
    }
    /**
     * Set the database instance (for Electron SQLite)
     */
    setDatabase(db) {
        this.database = db;
    }
    /**
     * Start listening for network changes and auto-sync when back online
     */
    startAutoSync() {
        if (this.networkUnsubscribe) {
            return; // Already listening
        }
        this.networkUnsubscribe = this.networkMonitor.subscribe((status) => {
            if (status === 'online') {
                console.log('🔄 Network restored - triggering auto-sync...');
                this.syncPending()
                    .then((result) => {
                    console.log(`✅ Auto-sync complete: ${result.synced} synced, ${result.failed} failed`);
                })
                    .catch((error) => {
                    console.error('❌ Auto-sync failed:', error);
                });
            }
        });
    }
    /**
     * Stop auto-sync listener
     */
    stopAutoSync() {
        if (this.networkUnsubscribe) {
            this.networkUnsubscribe();
            this.networkUnsubscribe = null;
        }
    }
    /**
     * Get current network status
     */
    getNetworkStatus() {
        return this.networkMonitor.isOnline() ? 'online' : 'offline';
    }
    /**
     * Get pending changes from outbox table
     */
    async getPendingChanges() {
        if (!this.database) {
            console.warn('Database not initialized');
            return [];
        }
        try {
            const stmt = this.database.prepare(`
        SELECT * FROM outbox ORDER BY created_at ASC LIMIT ?
      `);
            return stmt.all(this.batchSize);
        }
        catch (error) {
            console.error('Error fetching pending changes:', error);
            return [];
        }
    }
    /**
     * Sync pending changes to Supabase
     */
    async syncPending() {
        const changes = await this.getPendingChanges();
        if (changes.length === 0) {
            return { synced: 0, failed: 0, errors: [] };
        }
        console.log(`🔄 Syncing ${changes.length} pending changes...`);
        // Check network connectivity first
        if (!await this.isNetworkAvailable()) {
            console.warn('⚠️ Network not available - skipping sync');
            return {
                synced: 0,
                failed: changes.length,
                errors: changes.map((c) => ({
                    changeId: c.id,
                    error: 'Network unavailable',
                })),
            };
        }
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.authToken}`,
                },
                body: JSON.stringify({ changes }),
                signal: AbortSignal.timeout(30000), // 30 second timeout
            });
            if (!response.ok) {
                throw new Error(`Sync failed: ${response.statusText}`);
            }
            const result = await response.json();
            // Mark successful changes as synced
            const successfulChangeIds = changes
                .map((c) => c.id)
                .filter((id) => !result.errors?.some((e) => e.changeId === id));
            await this.markAsSynced(successfulChangeIds);
            // Increment retry count for failed changes
            const failedChanges = result.errors || [];
            for (const failed of failedChanges) {
                await this.incrementRetryCount(failed.changeId);
            }
            console.log(`✅ Sync complete: ${result.synced} synced, ${result.failed} failed`);
            return {
                synced: result.synced,
                failed: result.failed,
                errors: result.errors || [],
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? this.categorizeError(error) : String(error);
            console.error('Sync error:', errorMessage);
            // Increment retry counts for all changes on network error
            const changes = await this.getPendingChanges();
            await Promise.all(changes.map((c) => this.incrementRetryCount(c.id)));
            return {
                synced: 0,
                failed: changes.length,
                errors: changes.map((c) => ({
                    changeId: c.id,
                    error: errorMessage,
                })),
            };
        }
    }
    /**
     * Retry failed changes
     */
    async retryFailed(maxAttemptsExceeded = 3) {
        if (!this.database) {
            console.warn('Database not initialized');
            return { synced: 0, failed: 0, errors: [] };
        }
        try {
            const query = `
        SELECT * FROM changes_outbox
        WHERE synced_at IS NULL AND sync_attempts < ?
        ORDER BY sync_attempts ASC, created_at ASC
        LIMIT ?
      `;
            const failedChanges = this.database
                .prepare(query)
                .all(maxAttemptsExceeded, this.batchSize);
            if (failedChanges.length === 0) {
                console.log('✅ No failed changes to retry');
                return { synced: 0, failed: 0, errors: [] };
            }
            console.log(`🔄 Retrying ${failedChanges.length} failed changes...`);
            // Apply exponential backoff based on attempt count
            const maxAttempts = Math.max(...failedChanges.map((c) => c.sync_attempts));
            const delayMs = this.baseDelayMs * Math.pow(2, maxAttempts);
            console.log(`⏳ Waiting ${delayMs}ms before retry...`);
            await this.sleep(delayMs);
            return this.syncPending();
        }
        catch (error) {
            console.error('Error retrying failed changes:', error);
            return {
                synced: 0,
                failed: 0,
                errors: [
                    {
                        changeId: 'retry',
                        error: error instanceof Error ? error.message : 'Unknown error',
                    },
                ],
            };
        }
    }
    /**
     * Mark changes as synced
     */
    async markAsSynced(changeIds) {
        if (!this.database || changeIds.length === 0)
            return;
        try {
            const placeholders = changeIds.map(() => '?').join(',');
            const query = `
        UPDATE changes_outbox
        SET synced_at = CURRENT_TIMESTAMP
        WHERE id IN (${placeholders})
      `;
            this.database.prepare(query).run(...changeIds);
            console.log(`✅ Marked ${changeIds.length} changes as synced`);
        }
        catch (error) {
            console.error('Error marking changes as synced:', error);
        }
    }
    /**
     * Increment retry count for a change
     */
    async incrementRetryCount(changeId) {
        if (!this.database)
            return;
        try {
            const query = `
        UPDATE changes_outbox
        SET sync_attempts = sync_attempts + 1
        WHERE id = ?
      `;
            this.database.prepare(query).run(changeId);
        }
        catch (error) {
            console.error(`Error incrementing retry count for ${changeId}:`, error);
        }
    }
    /**
     * Set auth token (for authenticated sync)
     */
    setAuthToken(token) {
        this.authToken = token;
    }
    /**
     * Get sync status
     */
    async getSyncStatus() {
        if (!this.database) {
            return { pending: 0, failed: 0, total: 0 };
        }
        try {
            const pendingQuery = 'SELECT COUNT(*) as count FROM changes_outbox WHERE synced_at IS NULL';
            const totalQuery = 'SELECT COUNT(*) as count FROM changes_outbox';
            const pendingResult = this.database.prepare(pendingQuery).get();
            const totalResult = this.database.prepare(totalQuery).get();
            const failed = pendingResult.count;
            return {
                pending: failed,
                failed,
                total: totalResult.count,
            };
        }
        catch (error) {
            console.error('Error getting sync status:', error);
            return { pending: 0, failed: 0, total: 0 };
        }
    }
    /**
     * Clear all synced changes (cleanup)
     */
    async clearSynced() {
        if (!this.database)
            return;
        try {
            const query = 'DELETE FROM changes_outbox WHERE synced_at IS NOT NULL';
            this.database.prepare(query).run();
            console.log('✅ Cleared synced changes from outbox');
        }
        catch (error) {
            console.error('Error clearing synced changes:', error);
        }
    }
    /**
     * Helper: Sleep for ms milliseconds
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Check if network is available
     */
    async isNetworkAvailable() {
        // Check if we're in browser/electron
        if (typeof window !== 'undefined') {
            return navigator.onLine;
        }
        // In Node.js, try a simple DNS lookup
        try {
            const dns = await Promise.resolve().then(() => __importStar(require('dns'))).then((m) => m.default)
                .catch(() => null);
            if (!dns)
                return true; // Assume online if DNS not available
            return new Promise((resolve) => {
                dns.lookup('google.com', (err) => {
                    resolve(err === null);
                });
            });
        }
        catch {
            return true; // Assume online on error
        }
    }
    /**
     * Categorize network errors
     */
    categorizeError(error) {
        const message = error.message.toLowerCase();
        if (message.includes('network') || message.includes('enotfound')) {
            return 'Network error - check your connection';
        }
        if (message.includes('timeout') || message.includes('timedout')) {
            return 'Request timeout - server took too long';
        }
        if (message.includes('econnrefused')) {
            return 'Connection refused - server not reachable';
        }
        if (message.includes('econnreset')) {
            return 'Connection reset by server';
        }
        return error.message;
    }
}
exports.OutboxSyncService = OutboxSyncService;
exports.default = OutboxSyncService;
//# sourceMappingURL=outboxSync.js.map