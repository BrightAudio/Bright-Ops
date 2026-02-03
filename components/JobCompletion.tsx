'use client';

import React, { useState } from 'react';
import { CheckCircle, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface JobCompletionButtonProps {
  jobId: string;
  jobTitle: string;
  currentStatus?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function JobCompletionButton({
  jobId,
  jobTitle,
  currentStatus,
  onSuccess,
  onError,
}: JobCompletionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCompleteJob = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setShowConfirm(false);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete job';
      onError?.(message);
      console.error('Error completing job:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (currentStatus === 'completed') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <span className="text-sm font-medium text-green-700">Completed</span>
      </div>
    );
  }

  return (
    <div>
      {showConfirm ? (
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-600">Mark "{jobTitle}" as completed?</p>
          <button
            onClick={handleCompleteJob}
            disabled={isLoading}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-sm font-medium transition"
          >
            {isLoading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              'Confirm'
            )}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isLoading}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-400 text-gray-800 rounded text-sm font-medium transition"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition"
        >
          <CheckCircle className="w-4 h-4" />
          Mark Complete
        </button>
      )}
    </div>
  );
}

interface JobStatusBadgeProps {
  status?: string;
  completedAt?: string;
}

export function JobStatusBadge({ status, completedAt }: JobStatusBadgeProps) {
  const getStatusColor = (s: string | undefined) => {
    switch (s) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (s: string | undefined) => {
    switch (s) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      default:
        return s || 'Unknown';
    }
  };

  return (
    <div className={`inline-flex flex-col gap-1`}>
      <span className={`px-3 py-1 border rounded-full text-sm font-medium ${getStatusColor(status)}`}>
        {getStatusLabel(status)}
      </span>
      {completedAt && status === 'completed' && (
        <span className="text-xs text-gray-600">
          Completed {new Date(completedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}

interface QuarterlyJobStatsProps {
  completedCount: number;
  totalCount: number;
  completedRevenue: number;
  totalRevenue: number;
}

export function QuarterlyJobStats({
  completedCount,
  totalCount,
  completedRevenue,
  totalRevenue,
}: QuarterlyJobStatsProps) {
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const revenueProgress = totalRevenue > 0 ? Math.round((completedRevenue / totalRevenue) * 100) : 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Jobs Completed</span>
          <span className="text-sm font-bold text-gray-900">
            {completedCount} of {totalCount} ({percentComplete}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Revenue Realized</span>
          <span className="text-sm font-bold text-gray-900">
            ${completedRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })} of $
            {totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({revenueProgress}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${revenueProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
