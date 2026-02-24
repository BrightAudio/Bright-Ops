/**
 * Use Sync Status Hook
 * React hook for monitoring sync status on desktop
 */

import { useEffect, useState, useCallback } from 'react';
import { isDesktop } from '@/db/repositories/base';

export interface SyncStatus {
  pending: number;
  synced: number;
  failed: number;
  lastSyncAt: string | null;
  isSyncing: boolean;
}

/**
 * Hook to monitor sync status
 * Desktop: Queries changes_outbox table
 * Web: Returns stub (no sync needed)
 */
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>({
    pending: 0,
    synced: 0,
    failed: 0,
    lastSyncAt: null,
    isSyncing: false,
  });

  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!isDesktop()) {
      // Web doesn't need sync status
      return;
    }

    try {
      const result = await (window as any).electronAPI.sync.getStatus();
      if (result.success) {
        setStatus({
          ...result.data,
          isSyncing: false,
        });
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  // Poll status every 5 seconds
  useEffect(() => {
    if (!isDesktop()) return;

    // Initial load
    refreshStatus();

    // Poll for updates
    const interval = setInterval(refreshStatus, 5000);

    // Listen for sync progress events
    if ((window as any).electronAPI?.onSyncProgress) {
      const unsubscribe = (window as any).electronAPI.onSyncProgress(
        (progress: any) => {
          setStatus(prev => ({
            ...prev,
            ...progress,
          }));
        }
      );

      return () => {
        clearInterval(interval);
        unsubscribe?.();
      };
    }

    return () => clearInterval(interval);
  }, [refreshStatus]);

  const syncNow = useCallback(async () => {
    if (!isDesktop()) return;

    try {
      setStatus(prev => ({ ...prev, isSyncing: true }));
      const result = await (window as any).electronAPI.sync.syncNow();
      
      if (result.success) {
        setStatus(prev => ({
          ...prev,
          ...result.data,
          isSyncing: false,
        }));
        setError(null);
      } else {
        setError(result.error);
        setStatus(prev => ({ ...prev, isSyncing: false }));
      }
    } catch (err) {
      setError((err as Error).message);
      setStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, []);

  return {
    status,
    error,
    syncNow,
    refreshStatus,
    isDesktop: isDesktop(),
  };
}

/**
 * Sync Status Display Component
 * Shows sync status and provides manual sync button
 */
export function SyncStatusIndicator() {
  const { status, error, syncNow, isDesktop: isDesktopMode } = useSyncStatus();

  if (!isDesktopMode) {
    return null; // Not shown on web
  }

  const hasPending = status.pending > 0;
  const hasFailed = status.failed > 0;

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Sync Status</h3>
        {status.isSyncing && (
          <span className="inline-flex animate-spin text-blue-500">⚡</span>
        )}
      </div>

      <div className="text-sm space-y-1 mb-3">
        {hasPending && (
          <div className="text-yellow-600 font-medium">
            ⏳ {status.pending} changes pending
          </div>
        )}
        {hasFailed && (
          <div className="text-red-600 font-medium">
            ❌ {status.failed} sync failed
          </div>
        )}
        {status.synced > 0 && !hasPending && !hasFailed && (
          <div className="text-green-600 font-medium">
            ✅ All synced
          </div>
        )}
        {status.lastSyncAt && (
          <div className="text-gray-500 text-xs">
            Last sync: {new Date(status.lastSyncAt).toLocaleTimeString()}
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-600 text-xs mb-2 p-2 bg-red-50 rounded">
          {error}
        </div>
      )}

      <button
        onClick={syncNow}
        disabled={status.isSyncing || (!hasPending && !hasFailed)}
        className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
          status.isSyncing
            ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
            : hasPending || hasFailed
            ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
            : 'bg-gray-100 text-gray-600 cursor-not-allowed'
        }`}
      >
        {status.isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>

      <div className="text-xs text-gray-500 mt-2">
        📊 Synced: {status.synced}
      </div>
    </div>
  );
}

/**
 * Offline Indicator Component
 * Shows when desktop is offline
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!isDesktop()) return;

    // Check initial state
    const checkOnline = async () => {
      try {
        const result = await (window as any).electronAPI.app?.isOffline();
        setIsOnline(!result);
      } catch {
        setIsOnline(true); // Assume online if check fails
      }
    };

    checkOnline();

    // Listen for online/offline events
    if ((window as any).electronAPI?.onOnline) {
      const unsubscribeOnline = (window as any).electronAPI.onOnline(() => {
        setIsOnline(true);
      });
      const unsubscribeOffline = (window as any).electronAPI.onOffline(() => {
        setIsOnline(false);
      });

      return () => {
        unsubscribeOnline?.();
        unsubscribeOffline?.();
      };
    }
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-4 left-4 bg-amber-100 border border-amber-300 rounded-lg p-3 flex items-center gap-2">
      <span className="text-lg">📡</span>
      <span className="text-sm font-medium text-amber-900">
        Offline Mode - Changes will sync when online
      </span>
    </div>
  );
}
