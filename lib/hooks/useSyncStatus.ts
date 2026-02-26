import { useState, useEffect, useCallback } from 'react';
import { getNetworkMonitor } from '@/lib/sync/networkMonitor';

export interface SyncStatus {
  pending: number;
  synced: number;
  failed: number;
  lastSyncAt: string | null;
}

interface UseSync {
  status: SyncStatus | null;
  loading: boolean;
  error: string | null;
  isSyncing: boolean;
  networkStatus: 'online' | 'offline';
  syncNow: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  setAuthToken: (token: string) => Promise<void>;
}

/**
 * Hook for managing sync status and operations
 * Only works in Electron desktop app context (requires IPC)
 */
export function useSyncStatus(): UseSync {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');

  // Check if we're in Electron
  const isElectron = typeof window !== 'undefined' && (window as any).electron?.ipcRenderer;

  // Get IPC renderer
  const getIPC = useCallback(() => {
    if (!isElectron) return null;
    return (window as any).electron.ipcRenderer;
  }, [isElectron]);

  // Refresh sync status
  const refreshStatus = useCallback(async (): Promise<void> => {
    const ipc = getIPC();
    if (!ipc) {
      setError('Not in Electron context');
      return;
    }

    try {
      const result = await ipc.invoke('sync:getStatus');
      if (result.success) {
        setStatus(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [getIPC]);

  // Perform sync
  const syncNow = useCallback(async (): Promise<void> => {
    const ipc = getIPC();
    if (!ipc) {
      setError('Not in Electron context');
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      const result = await ipc.invoke('sync:syncNow');
      if (result.success) {
        setStatus(result.data?.status);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    } finally {
      setIsSyncing(false);
    }
  }, [getIPC]);

  // Set auth token
  const setAuthToken = useCallback(
    async (token: string): Promise<void> => {
      const ipc = getIPC();
      if (!ipc) {
        setError('Not in Electron context');
        return;
      }

      try {
        const result = await ipc.invoke('sync:setAuthToken', token);
        if (!result.success) {
          setError(result.error);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
      }
    },
    [getIPC]
  );

  // Initial load
  useEffect(() => {
    if (!isElectron) {
      setLoading(false);
      setError('Sync only available in desktop app');
      return;
    }

    refreshStatus();

    // Set up network monitor
    const networkMonitor = getNetworkMonitor();
    setNetworkStatus(networkMonitor.isOnline() ? 'online' : 'offline');

    const unsubscribe = networkMonitor.subscribe((status) => {
      setNetworkStatus(status);
    });

    // Poll for status updates every 5 seconds
    const interval = setInterval(() => {
      refreshStatus();
    }, 5000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [isElectron, refreshStatus]);

  return {
    status: status || { pending: 0, synced: 0, failed: 0, lastSyncAt: null },
    loading,
    error,
    isSyncing,
    networkStatus,
    syncNow,
    refreshStatus,
    setAuthToken,
  };
}

export default useSyncStatus;
