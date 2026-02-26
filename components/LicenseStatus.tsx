'use client';

import React from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { useLicense } from '@/lib/hooks/useLicense';
import { getLicenseUIState, isRenewalUrgent, type LicenseStatus } from '@/lib/license/permissions';

interface LicenseStatusProps {
  compact?: boolean;
  showDetails?: boolean;
}

/**
 * License Status Component
 * Displays current license status and renewal prompts
 */
export default function LicenseStatus({
  compact = false,
  showDetails = true,
}: LicenseStatusProps): React.ReactElement {
  const { license, loading, error } = useLicense();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-gray-500">
        <Clock className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading license...</span>
      </div>
    );
  }

  if (error || !license) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-red-600 bg-red-50 rounded">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{error || 'License unavailable'}</span>
      </div>
    );
  }

  const status = license.status || 'unknown';
  const plan = license.plan || 'Unknown';
  const uiState = getLicenseUIState(status, plan);

  const IconComponent =
    uiState.icon === 'check'
      ? CheckCircle
      : uiState.icon === 'alert'
        ? AlertCircle
        : uiState.icon === 'warning'
          ? AlertTriangle
          : Lock;

  const bgColor =
    uiState.color === 'green'
      ? 'bg-green-50'
      : uiState.color === 'amber'
        ? 'bg-amber-50'
        : uiState.color === 'orange'
          ? 'bg-orange-50'
          : 'bg-red-50';

  const textColor =
    uiState.color === 'green'
      ? 'text-green-600'
      : uiState.color === 'amber'
        ? 'text-amber-600'
        : uiState.color === 'orange'
          ? 'text-orange-600'
          : 'text-red-600';

  const borderColor =
    uiState.color === 'green'
      ? 'border-green-200'
      : uiState.color === 'amber'
        ? 'border-amber-200'
        : uiState.color === 'orange'
          ? 'border-orange-200'
          : 'border-red-200';

  // Calculate days remaining from grace_expires_at
  let daysRemaining = 0;
  if (license.grace_expires_at) {
    const expiresAt = new Date(license.grace_expires_at).getTime();
    const now = Date.now();
    daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
  }

  const isUrgent = isRenewalUrgent(status, daysRemaining);

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${bgColor}`}>
        <IconComponent className={`w-4 h-4 ${textColor}`} />
        <span className={`text-sm font-medium ${textColor}`}>{uiState.label}</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border ${borderColor} p-4 ${bgColor} `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${textColor}`} />
          <div>
            <h3 className={`font-semibold ${textColor}`}>{uiState.label}</h3>
            <p className="text-sm text-gray-600 mt-1">{uiState.description}</p>

            {status !== 'active' && daysRemaining > 0 && (
              <p className={`text-sm font-medium mt-2 ${isUrgent ? 'text-red-600' : 'text-gray-600'}`}>
                {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
              </p>
            )}

            {showDetails && license.last_verified_at && (
              <p className="text-xs text-gray-500 mt-2">
                Last verified:{' '}
                {new Date(license.last_verified_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {status !== 'active' && (
          <a
            href="/account/billing"
            className={`ml-4 px-4 py-2 rounded font-medium text-sm text-white transition-colors ${
              isUrgent
                ? 'bg-red-600 hover:bg-red-700'
                : status === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            Renew Now
          </a>
        )}
      </div>

      {/* Action restrictions info */}
      {(status === 'limited' || status === 'restricted') && (
        <div className="mt-4 pt-4 border-t border-current border-opacity-20">
          <p className="text-xs font-medium text-gray-600 mb-2">
            {status === 'limited' ? 'Sync is disabled. ' : 'The following actions are limited: '}
          </p>
          <ul className="text-xs text-gray-600 space-y-1">
            {status === 'limited' && (
              <>
                <li>✅ View and edit inventory locally</li>
                <li>❌ Sync changes to cloud</li>
                <li>✅ Create and complete jobs</li>
              </>
            )}
            {status === 'restricted' && (
              <>
                <li>✅ View inventory (read-only)</li>
                <li>✅ Export data</li>
                <li>❌ Create jobs</li>
                <li>❌ Add inventory</li>
                <li>❌ Sync to cloud</li>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
