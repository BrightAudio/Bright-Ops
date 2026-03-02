/**
 * Auto-Update + Version Enforcement Module
 * Handles electron-updater integration and minimum version enforcement
 */

import { app, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';

type VersionPolicy = {
  min_version: string;
  latest_version?: string;
  force_update?: boolean;
};

/**
 * Compare semantic versions
 * returns -1 if a<b, 0 if equal, 1 if a>b
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10));
  const pb = b.split('.').map(n => parseInt(n, 10));
  
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

/**
 * Fetch version policy from your API
 */
async function fetchVersionPolicy(): Promise<VersionPolicy | null> {
  const url = process.env.NEXT_PUBLIC_APP_VERSION_POLICY_URL;
  if (!url) {
    console.warn('⚠️  NEXT_PUBLIC_APP_VERSION_POLICY_URL not set, skipping version policy fetch');
    return null;
  }
  
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      console.error(`❌ Version policy fetch failed: ${res.status}`);
      return null;
    }
    return (await res.json()) as VersionPolicy;
  } catch (err) {
    console.error('❌ Version policy fetch error:', err);
    return null;
  }
}

export interface UpdateGateState {
  updateRequired: boolean;
  minVersion?: string;
}

/**
 * Initialize auto-update and version enforcement
 * Call this from app.whenReady() after database init
 */
export async function initAutoUpdateAndVersionEnforcement(
  options?: {
    onUpdateGateChanged?: (gate: UpdateGateState) => void;
  }
): Promise<UpdateGateState> {
  const state: UpdateGateState = {
    updateRequired: false,
  };

  // Never run autoUpdater in dev
  if (!app.isPackaged) {
    console.log('ℹ️  Dev mode detected, auto-updater disabled');
    return state;
  }

  console.log('🔄 Initializing auto-updater and version enforcement...');

  // Enable logging for debugging (can be removed in production)
  autoUpdater.logger = console as any;
  autoUpdater.autoDownload = true;

  // --- Version enforcement (min_version check) ---
  const current = app.getVersion();
  const policy = await fetchVersionPolicy();

  if (policy?.min_version) {
    const tooOld = compareVersions(current, policy.min_version) < 0;
    state.updateRequired = tooOld;
    state.minVersion = policy.min_version;

    if (tooOld) {
      console.warn(`⚠️  Current version ${current} is below minimum ${policy.min_version}`);

      // Notify caller
      options?.onUpdateGateChanged?.(state);

      // Show warning dialog
      dialog.showMessageBoxSync({
        type: 'warning',
        buttons: ['Check for Update', 'Quit'],
        defaultId: 0,
        cancelId: 1,
        title: 'Update Required',
        message: `Your version (${current}) is no longer supported.`,
        detail: `Minimum required version is ${policy.min_version}. Please update to continue using sync and creation features.`,
      });

      // Trigger update check immediately
      autoUpdater.checkForUpdates().catch(err => {
        console.error('❌ Error checking for updates:', err);
      });

      // Graceful degradation: don't quit immediately, let app continue read-only
      // You can add hard quit here if you prefer strict enforcement
    } else {
      console.log(`✅ Version ${current} meets minimum ${policy.min_version}`);
      options?.onUpdateGateChanged?.(state);
    }
  }

  // --- Auto-update events ---
  autoUpdater.on('update-available', () => {
    console.log('📥 Update available, downloading...');
  });

  autoUpdater.on('update-downloaded', async () => {
    console.log('✅ Update downloaded, prompting user...');
    const result = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update Ready',
      message: 'An update has been downloaded.',
      detail: 'Restart Bright Ops to apply the update.',
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('❌ Auto-updater error:', err);
  });

  // Check for updates immediately
  autoUpdater.checkForUpdates().catch(err => {
    console.error('❌ Error during initial update check:', err);
  });

  // Check every 6 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.error('❌ Error during periodic update check:', err);
    });
  }, 6 * 60 * 60 * 1000);

  return state;
}
