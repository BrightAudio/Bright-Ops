'use client';

import React from 'react';
import { useSyncStatus } from '@/lib/hooks/useSyncStatus';
import SyncStatusIndicator from '@/components/SyncStatusIndicator';
import { RefreshCw, AlertTriangle } from 'lucide-react';

/**
 * Desktop Sync Widget Page
 * Displays comprehensive sync status and provides sync controls
 * Only renders in Electron desktop app context
 */
export default function DesktopSyncWidget(): React.ReactElement {
  const { status, loading, error, isSyncing, networkStatus, syncNow } = useSyncStatus();

  // Not in Electron context
  if (!status) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600 mb-4">This page is only available in the desktop app</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Sync Status</h1>
          <p className="text-slate-600">Manage your offline changes and synchronization</p>
        </div>

        {/* Main Status Card */}
        <div className="card bg-white rounded-lg shadow-md p-6 mb-6">
          <SyncStatusIndicator 
            status={status} 
            networkStatus={networkStatus}
            onSync={syncNow}
            showDetails={true}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-amber-600">{status.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600">{status.synced}</div>
            <div className="text-sm text-gray-600">Synced</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-red-600">{status.failed}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
        </div>

        {/* Network Status Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Network Status</h2>
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${networkStatus === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />
            <div>
              <p className="font-medium text-slate-900">
                {networkStatus === 'online' ? '🟢 Connected' : '🔴 Disconnected'}
              </p>
              <p className="text-sm text-slate-600">
                {networkStatus === 'online' 
                  ? 'Your connection is active. Changes will sync automatically.'
                  : 'You are offline. Changes will sync when your connection is restored.'}
              </p>
            </div>
          </div>
        </div>

        {/* Manual Sync Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Manual Sync</h2>
          <button
            onClick={syncNow}
            disabled={isSyncing || networkStatus === 'offline' || status.pending === 0}
            className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
              isSyncing || networkStatus === 'offline' || status.pending === 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <p className="text-sm text-slate-600 mt-3">
            {status.pending === 0
              ? 'No changes to sync'
              : networkStatus === 'offline'
              ? 'Please connect to the internet to sync'
              : 'Click to manually sync all pending changes'}
          </p>
        </div>

        {/* Status Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Sync Details</h2>
          <div className="space-y-3">
            {status.lastSyncAt && (
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-600">Last Sync</span>
                <span className="font-medium text-slate-900">
                  {new Date(status.lastSyncAt).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600">Loading Status</span>
              <span className="font-medium text-slate-900">
                {loading ? 'Loading...' : 'Ready'}
              </span>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-slate-600">
          <p>Changes are automatically saved locally on your device</p>
          <p>and synced to the cloud when connected</p>
        </div>
      </div>
    </div>
  );
}
