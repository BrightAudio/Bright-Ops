/**
 * Sync IPC Handlers
 * Handle offline-first sync operations
 */
export type SyncStatus = {
    pending: number;
    synced: number;
    failed: number;
    lastSyncAt: string | null;
};
/**
 * Register all sync handlers
 */
export declare function registerSyncHandlers(): void;
//# sourceMappingURL=sync.d.ts.map