import { useState, useEffect, useCallback } from 'react';

export type LicenseStatus = 'active' | 'warning' | 'limited' | 'restricted' | 'unknown';

export interface CachedLicenseState {
  license_id: string | null;
  plan: string | null;
  status: LicenseStatus;
  last_verified_at: string | null;
  next_verify_at: string | null;
  grace_expires_at: string | null;
  cached_features: string;
  cached_sync_enabled: 0 | 1;
  cached_can_create_jobs: 0 | 1;
  cached_can_add_inventory: 0 | 1;
}

interface UseLicense {
  license: CachedLicenseState | null;
  loading: boolean;
  error: string | null;
  verify: (userId: string, deviceId: string, appVersion: string) => Promise<boolean>;
  canPerform: (action: 'sync' | 'create_job' | 'add_inventory') => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * Hook for license management on desktop
 * Reads from local cache and allows verification against server
 */
export function useLicense(): UseLicense {
  const [license, setLicense] = useState<CachedLicenseState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if we're in Electron
  const isElectron = typeof window !== 'undefined' && (window as any).electron?.ipcRenderer;

  const getIPC = useCallback(() => {
    if (!isElectron) return null;
    return (window as any).electron.ipcRenderer;
  }, [isElectron]);

  // Load current license state from cache
  const refresh = useCallback(async (): Promise<void> => {
    const ipc = getIPC();
    if (!ipc) {
      setError('Not in Electron context');
      setLoading(false);
      return;
    }

    try {
      const result = await ipc.invoke('license:getState');
      if (result.success) {
        setLicense(result.data);
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

  // Verify license with server and update cache
  const verify = useCallback(
    async (userId: string, deviceId: string, appVersion: string): Promise<boolean> => {
      const ipc = getIPC();
      if (!ipc) {
        setError('Not in Electron context');
        return false;
      }

      setLoading(true);
      try {
        const result = await ipc.invoke('license:verify', {
          userId,
          deviceId,
          deviceName: 'Desktop App',
          appVersion,
        });

        if (result.success) {
          // Re-fetch cached state
          await refresh();
          return true;
        } else {
          setError(result.error);
          return false;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [getIPC, refresh]
  );

  // Check if user can perform an action
  const canPerform = useCallback(
    async (action: 'sync' | 'create_job' | 'add_inventory'): Promise<boolean> => {
      const ipc = getIPC();
      if (!ipc) {
        return false;
      }

      try {
        const result = await ipc.invoke('license:canPerform', action);
        if (result.success) {
          return result.allowed;
        }
        return false;
      } catch (err) {
        console.error(`Error checking permission for ${action}:`, err);
        return false;
      }
    },
    [getIPC]
  );

  // Load on mount
  useEffect(() => {
    if (isElectron) {
      refresh();
    }
  }, [isElectron, refresh]);

  return {
    license,
    loading,
    error,
    verify,
    canPerform,
    refresh,
  };
}

export default useLicense;
