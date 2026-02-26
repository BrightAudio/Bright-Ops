'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Loader, WifiOff, Wifi } from 'lucide-react';

export interface SyncStatus {
  pending: number;
  synced: number;
  failed: number;
  lastSyncAt: string | null;
  isSyncing?: boolean;
  error?: string;
}

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  networkStatus?: 'online' | 'offline';
  onSync?: () => Promise<void>;
  compact?: boolean;
  showDetails?: boolean;
}

/**
 * SyncStatusIndicator Component
 * Displays sync status, pending changes, and provides manual sync button
 */
export default function SyncStatusIndicator({
  status,
  networkStatus = 'online',
  onSync,
  compact = false,
  showDetails = true,
}: SyncStatusIndicatorProps): React.ReactElement {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSync = async (): Promise<void> => {
    if (!onSync || isSyncing) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      await onSync();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  // Determine status color and icon
  let statusColor = 'text-green-600';
  let bgColor = 'bg-green-50';
  let StatusIcon = CheckCircle;

  if (networkStatus === 'offline') {
    statusColor = 'text-gray-600';
    bgColor = 'bg-gray-50';
    StatusIcon = WifiOff;
  } else if (status.pending > 0) {
    statusColor = 'text-amber-600';
    bgColor = 'bg-amber-50';
    StatusIcon = AlertCircle;
  }

  if (status.error || syncError) {
    statusColor = 'text-red-600';
    bgColor = 'bg-red-50';
    StatusIcon = WifiOff;
  }

  if (isSyncing || status.isSyncing) {
    statusColor = 'text-blue-600';
    bgColor = 'bg-blue-50';
    StatusIcon = Loader;
  }

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${bgColor}`}>
        <StatusIcon className={`w-4 h-4 ${statusColor} ${isSyncing ? 'animate-spin' : ''}`} />
        <span className={`text-sm font-medium ${statusColor}`}>
          {status.pending > 0 ? `${status.pending} pending` : 'Synced'}
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${bgColor} ${statusColor.replace('text-', 'border-')}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <StatusIcon
            className={`w-5 h-5 mt-0.5 flex-shrink-0 ${statusColor} ${isSyncing ? 'animate-spin' : ''}`}
          />
          <div>
            <h3 className={`font-semibold ${statusColor}`}>
              {isSyncing || status.isSyncing ? 'Syncing...' : 'Sync Status'}
            </h3>

            {showDetails && (
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {networkStatus === 'online' ? (
                    <>
                      <Wifi className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-600">Offline</span>
                    </>
                  )}
                </div>

                {status.pending > 0 && (
                  <p>
                    <span className="font-medium">{status.pending}</span> pending changes
                  </p>
                )}
                {status.synced > 0 && (
                  <p>
                    <span className="font-medium">{status.synced}</span> synced
                  </p>
                )}
                {status.failed > 0 && (
                  <p className="text-red-600">
                    <span className="font-medium">{status.failed}</span> failed
                  </p>
                )}
                {status.lastSyncAt && (
                  <p className="text-xs text-gray-600">
                    Last sync: {new Date(status.lastSyncAt).toLocaleTimeString()}
                  </p>
                )}
              </div>
            )}

            {syncError && (
              <p className="text-sm text-red-600 mt-2">
                Error: {syncError}
              </p>
            )}

            {status.error && (
              <p className="text-sm text-red-600 mt-2">
                Error: {status.error}
              </p>
            )}
          </div>
        </div>

        {onSync && (
          <button
            onClick={handleSync}
            disabled={isSyncing || status.isSyncing || status.pending === 0}
            className={`ml-4 px-3 py-2 rounded font-medium text-sm transition-colors ${
              isSyncing || status.isSyncing || status.pending === 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : statusColor.replace('text-', 'hover:bg-')
                  ? `text-white ${statusColor.replace('text-', 'bg-')} hover:opacity-90`
                  : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSyncing || status.isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>

      {status.pending > 0 && (
        <div className="mt-3 text-xs text-gray-600">
          {networkStatus === 'offline' 
            ? '⏳ You are offline. Changes will sync automatically when your connection is restored.'
            : '⏳ Changes will sync automatically when you go online.'}
        </div>
      )}
    </div>
  );
}
