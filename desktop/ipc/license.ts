/**
 * Desktop License Management
 * Handles local license state caching and enforcement
 */

import { ipcMain } from 'electron';
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
        cached_can_add_inventory integer default 0
      )
    `).run();

    // Ensure singleton row
    db.prepare(`
      insert or ignore into license_state (
        id, status, cached_features, cached_sync_enabled, 
        cached_can_create_jobs, cached_can_add_inventory
      ) values (1, 'unknown', '{}', 0, 0, 0)
    `).run();

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
    };
  } catch (error) {
    console.error('Error reading license state:', error);
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
        cached_can_add_inventory = ?
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
      verifyResponse.can_add_inventory ? 1 : 0
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
        deviceId: string;
        deviceName?: string;
        appVersion: string;
      }
    ) => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/license/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            deviceId,
            deviceName,
            appVersion,
          }),
        });

        if (!response.ok) {
          throw new Error(`License verify failed: ${response.statusText}`);
        }

        const verifyResponse = await response.json();

        // Cache the successful verification
        updateLicenseCache(verifyResponse);

        return { success: true, data: verifyResponse };
      } catch (error) {
        console.error('License verification error:', error);
        return {
          success: false,
          error: (error as any).message ?? 'License verification failed',
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
