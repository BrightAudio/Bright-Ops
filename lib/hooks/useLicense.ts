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

  // Load current license state from cache
  const refresh = useCallback(async (): Promise<void> => {
    // Check if we're in Electron
    const isElectron = typeof window !== 'undefined' && (window as any).electron?.ipcRenderer;
    const ipc = isElectron ? (window as any).electron.ipcRenderer : null;

    if (!ipc) {
      // Browser testing mode - check localStorage
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('test_license_state');
          if (stored) {
            const data = JSON.parse(stored);
            setLicense(data);
            setError(null);
          } else {
            // Default test license (Pro tier)
            const defaultLicense: CachedLicenseState = {
              license_id: 'test-license',
              plan: 'pro',
              status: 'active',
              last_verified_at: new Date().toISOString(),
              next_verify_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              grace_expires_at: null,
              cached_features: 'all',
              cached_sync_enabled: 1,
              cached_can_create_jobs: 1,
              cached_can_add_inventory: 1,
            };
            setLicense(defaultLicense);
            setError(null);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to load test license';
          setError(errorMsg);
        }
      }
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
  }, []);

  // Verify license with server and update cache
  const verify = useCallback(
    async (userId: string, deviceId: string, appVersion: string): Promise<boolean> => {
      const isElectron = typeof window !== 'undefined' && (window as any).electron?.ipcRenderer;
      const ipc = isElectron ? (window as any).electron.ipcRenderer : null;

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
    [refresh]
  );

  // Check if user can perform an action
  const canPerform = useCallback(
    async (action: 'sync' | 'create_job' | 'add_inventory'): Promise<boolean> => {
      const isElectron = typeof window !== 'undefined' && (window as any).electron?.ipcRenderer;
      const ipc = isElectron ? (window as any).electron.ipcRenderer : null;

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
    []
  );

  // Load on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    license,
    loading,
    error,
    verify,
    canPerform,
    refresh,
  };
}

/**
 * Set test license tier for browser testing
 * Usage in browser console: window.setTestLicenseTier('pro')
 */
export function setTestLicenseTier(plan: 'basic' | 'pro' | 'enterprise'): void {
  const testLicense: CachedLicenseState = {
    license_id: 'test-license',
    plan,
    status: 'active',
    last_verified_at: new Date().toISOString(),
    next_verify_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    grace_expires_at: null,
    cached_features: plan === 'basic' ? 'basic' : 'all',
    cached_sync_enabled: 1,
    cached_can_create_jobs: 1,
    cached_can_add_inventory: 1,
  };
  localStorage.setItem('test_license_state', JSON.stringify(testLicense));
  // Force page reload to pick up new license
  window.location.reload();
}

// Make test setter available in browser console
if (typeof window !== 'undefined') {
  (window as any).setTestLicenseTier = setTestLicenseTier;
}

export default useLicense;
