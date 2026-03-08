/**
 * Desktop License Management
 * Handles local license state caching and enforcement
 */

import { ipcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/sqlite';

export interface CachedLicenseState {
  license_id: string | null;
  plan: string | null;
  status: 'active' | 'warning' | 'limited' | 'restricted' | 'unknown';
  last_verified_at: string | null;
  next_verify_at: string | null;
  grace_expires_at: string | null;
  cached_features: string; // JSON
  cached_sync_enabled: 0 | 1;
  cached_can_create_jobs: 0 | 1;
  cached_can_add_inventory: 0 | 1;
  device_id: string;
  device_bound_at: string;
  cache_expires_at: string | null;
}

/**
 * Initialize license table (runs at app startup)
 */
export function initializeLicenseSchema(): void {
  const db = getDatabase();

  try {
    db.prepare(`
      create table if not exists license_state (
        id integer primary key check (id = 1),
        license_id text,
        plan text,
        status text check (status in ('active','warning','limited','restricted','unknown')),
        last_verified_at text,
        next_verify_at text,
        grace_expires_at text,
        cached_features text,
        cached_sync_enabled integer default 0,
        cached_can_create_jobs integer default 0,
        cached_can_add_inventory integer default 0,
        device_id text unique not null,
        device_bound_at text not null,
        cache_expires_at text
      )
    `).run();

    // Ensure singleton row with generated device_id
    const deviceId = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      insert or ignore into license_state (
        id, status, cached_features, cached_sync_enabled, 
        cached_can_create_jobs, cached_can_add_inventory,
        device_id, device_bound_at
      ) values (1, 'unknown', '{}', 0, 0, 0, ?, ?)
    `).run(deviceId, now);

    console.log('✅ License state table initialized');
  } catch (error) {
    console.error('Error initializing license table:', error);
  }
}

/**
 * Get current cached license state
 */
export function getCachedLicenseState(): CachedLicenseState {
  const db = getDatabase();

  try {
    const row = db
      .prepare('select * from license_state where id = 1')
      .get() as Partial<CachedLicenseState>;

    return {
      license_id: row.license_id ?? null,
      plan: row.plan ?? null,
      status: row.status ?? 'unknown',
      last_verified_at: row.last_verified_at ?? null,
      next_verify_at: row.next_verify_at ?? null,
      grace_expires_at: row.grace_expires_at ?? null,
      cached_features: row.cached_features ?? '{}',
      cached_sync_enabled: row.cached_sync_enabled ?? 0,
      cached_can_create_jobs: row.cached_can_create_jobs ?? 0,
      cached_can_add_inventory: row.cached_can_add_inventory ?? 0,
      device_id: row.device_id ?? uuidv4(),
      device_bound_at: row.device_bound_at ?? new Date().toISOString(),
      cache_expires_at: row.cache_expires_at ?? null,
    };
  } catch (error) {
    console.error('Error reading license state:', error);
    const deviceId = uuidv4();
    return {
      license_id: null,
      plan: null,
      status: 'unknown',
      last_verified_at: null,
      next_verify_at: null,
      grace_expires_at: null,
      cached_features: '{}',
      cached_sync_enabled: 0,
      cached_can_create_jobs: 0,
      cached_can_add_inventory: 0,
      device_id: deviceId,
      device_bound_at: new Date().toISOString(),
      cache_expires_at: null,
    };
  }
}

/**
 * Update license state after successful verification
 */
function updateLicenseCache(verifyResponse: {
  license_id: string;
  plan: string;
  status: string;
  grace_period: { expires_at: string | null };
  features: Record<string, boolean>;
  sync_enabled: boolean;
  can_create_jobs: boolean;
  can_add_inventory: boolean;
}): void {
  const db = getDatabase();

  try {
    const now = new Date();
    let nextVerifyAt = now;

    // Adaptive verification intervals
    if (verifyResponse.status === 'active') {
      nextVerifyAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h
    } else if (verifyResponse.status === 'warning') {
      nextVerifyAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2h
    } else if (verifyResponse.status === 'limited') {
      nextVerifyAt = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1h
    } else if (verifyResponse.status === 'restricted') {
      nextVerifyAt = new Date(now.getTime() + 30 * 60 * 1000); // 30m
    }

    // 7-day offline grace: cache expires 7 days from now if offline
    const cacheExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    db.prepare(`
      update license_state set
        license_id = ?,
        plan = ?,
        status = ?,
        last_verified_at = ?,
        next_verify_at = ?,
        grace_expires_at = ?,
        cached_features = ?,
        cached_sync_enabled = ?,
        cached_can_create_jobs = ?,
        cached_can_add_inventory = ?,
        cache_expires_at = ?
      where id = 1
    `).run(
      verifyResponse.license_id,
      verifyResponse.plan,
      verifyResponse.status,
      now.toISOString(),
      nextVerifyAt.toISOString(),
      verifyResponse.grace_period.expires_at,
      JSON.stringify(verifyResponse.features),
      verifyResponse.sync_enabled ? 1 : 0,
      verifyResponse.can_create_jobs ? 1 : 0,
      verifyResponse.can_add_inventory ? 1 : 0,
      cacheExpiresAt.toISOString()
    );

    console.log(`✅ License cached: ${verifyResponse.plan} - ${verifyResponse.status}`);
  } catch (error) {
    console.error('Error updating license cache:', error);
  }
}

/**
 * Register license IPC handlers
 */
export function registerLicenseHandlers(): void {
  console.log('🔐 Registering license IPC handlers...');

  /**
   * Get current cached license state
   */
  ipcMain.handle('license:getState', async () => {
    try {
      const state = getCachedLicenseState();
      return { success: true, data: state };
    } catch (error) {
      return { success: false, error: (error as any).message };
    }
  });

  /**
   * Verify license with server and cache result
   */
  ipcMain.handle(
    'license:verify',
    async (
      _event,
      {
        userId,
        deviceId,
        deviceName,
        appVersion,
      }: {
        userId: string;
        deviceId?: string;
        deviceName?: string;
        appVersion: string;
      }
    ) => {
      try {
        const state = getCachedLicenseState();
        const verifyDeviceId = deviceId || state.device_id;

        const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/license/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            deviceId: verifyDeviceId,
            deviceName,
            appVersion,
          }),
        });

        if (!response.ok) {
          // If offline, check if cache is still valid (7-day offline grace)
          if (response.status === 0 || response.status >= 500) {
            if (state.cache_expires_at && new Date(state.cache_expires_at) > new Date()) {
              console.log('📡 Offline - using cached license state');
              return { success: true, data: state, offline: true };
            } else {
              return {
                success: false,
                error: 'License cache expired - device offline for more than 7 days',
                offline: true,
              };
            }
          }
          throw new Error(`License verify failed: ${response.statusText}`);
        }

        const verifyResponse = await response.json() as {
          license_id: string;
          plan: string;
          status: string;
          grace_period: { expires_at: string | null };
          features: Record<string, boolean>;
          sync_enabled: boolean;
          can_create_jobs: boolean;
          can_add_inventory: boolean;
        };

        // Cache the successful verification
        updateLicenseCache(verifyResponse);

        return { success: true, data: { ...state, ...verifyResponse }, offline: false };
      } catch (error) {
        console.error('License verification error:', error);

        // On error, check if we can use cached state (offline grace)
        const state = getCachedLicenseState();
        if (
          state.cache_expires_at &&
          new Date(state.cache_expires_at) > new Date() &&
          state.status !== 'unknown'
        ) {
          console.log('📡 Offline - using cached license state');
          return { success: true, data: state, offline: true };
        }

        return {
          success: false,
          error: (error as any).message ?? 'License verification failed',
          offline: true,
        };
      }
    }
  );

  /**
   * Check if user can perform an action (gated operation)
   */
  ipcMain.handle(
    'license:canPerform',
    async (
      _event,
      action: 'sync' | 'create_job' | 'add_inventory'
    ): Promise<{ success: true; allowed: boolean } | { success: false; error: string }> => {
      try {
        const state = getCachedLicenseState();

        // If status is restricted, most operations blocked
        if (state.status === 'restricted') {
          if (action === 'sync') return { success: true, allowed: false };
          if (action === 'create_job') return { success: true, allowed: false };
          if (action === 'add_inventory') return { success: true, allowed: false };
        }

        // If status is limited, sync is blocked
        if (state.status === 'limited' && action === 'sync') {
          return { success: true, allowed: false };
        }

        // Check cached permissions
        if (action === 'sync') {
          return { success: true, allowed: state.cached_sync_enabled === 1 };
        }
        if (action === 'create_job') {
          return { success: true, allowed: state.cached_can_create_jobs === 1 };
        }
        if (action === 'add_inventory') {
          return { success: true, allowed: state.cached_can_add_inventory === 1 };
        }

        return { success: true, allowed: false };
      } catch (error) {
        return { success: false, error: (error as any).message };
      }
    }
  );

  console.log('✅ License handlers registered');
}
