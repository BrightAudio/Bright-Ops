/**
 * TokenDashboard.tsx - Display AI token balances and usage
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  Zap,
  TrendingUp,
  Brain,
  Target,
  Search,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { getAllTokenBalances, getTokenStats } from '@/lib/utils/aiTokens';

interface TokenStats {
  totalBalance: number;
  totalAllocated: number;
  totalUsed: number;
  byType: Array<{
    token_type: string;
    balance: number;
    total_allocated: number;
    total_used: number;
  }>;
  refreshDate: string;
}

interface TokenDashboardProps {
  organizationId: string;
  plan: 'starter' | 'pro' | 'enterprise';
  onLoadingChange?: (loading: boolean) => void;
}

const TOKEN_DISPLAY_INFO = {
  lead_generation: {
    label: 'Lead Generation',
    icon: Search,
    color: 'from-blue-500 to-blue-600',
    description: 'AI-powered lead discovery',
  },
  goal_generation: {
    label: 'Goal Generation',
    icon: Target,
    color: 'from-green-500 to-green-600',
    description: 'AI-powered goal creation',
  },
  strategy_analysis: {
    label: 'Strategy Analysis',
    icon: Brain,
    color: 'from-purple-500 to-purple-600',
    description: 'Strategic insights & analysis',
  },
  forecast: {
    label: 'Revenue Forecast',
    icon: TrendingUp,
    color: 'from-yellow-500 to-yellow-600',
    description: 'Revenue prediction & trends',
  },
};

export default function TokenDashboard({
  organizationId,
  plan,
  onLoadingChange,
}: TokenDashboardProps) {
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysUntilRefresh, setDaysUntilRefresh] = useState(0);

  useEffect(() => {
    loadTokens();
  }, [organizationId]);

  async function loadTokens() {
    try {
      setLoading(true);
      onLoadingChange?.(true);

      const tokenStats = await getTokenStats(organizationId);

      if (tokenStats) {
        setStats(tokenStats);

        // Calculate days until refresh
        if (tokenStats.refreshDate) {
          const refreshDate = new Date(tokenStats.refreshDate);
          const today = new Date();
          const daysLeft = Math.ceil(
            (refreshDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          setDaysUntilRefresh(Math.max(0, daysLeft));
        }
      }
    } catch (error) {
      console.error('Error loading token stats:', error);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-gray-500'>Loading token balance...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className='flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg'>
        <AlertCircle className='w-5 h-5 text-yellow-600' />
        <p className='text-sm text-yellow-700'>Unable to load token information</p>
      </div>
    );
  }

  if (plan === 'starter') {
    return (
      <div className='p-6 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg'>
        <div className='flex items-center gap-3 mb-3'>
          <Zap className='w-6 h-6 text-gray-400' />
          <h3 className='text-lg font-semibold text-gray-700'>AI Features</h3>
        </div>
        <p className='text-sm text-gray-600 mb-4'>
          Upgrade to Pro or Enterprise to unlock AI-powered features like lead generation, goal
          creation, and strategy analysis.
        </p>
        <button className='px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition'>
          View Plans
        </button>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Summary Card */}
      <div className='p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg'>
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-2'>
            <Zap className='w-5 h-5 text-indigo-600' />
            <h3 className='font-semibold text-gray-800'>AI Tokens</h3>
          </div>
          <button
            onClick={loadTokens}
            title='Refresh token balance'
            className='p-1 hover:bg-white rounded transition'
          >
            <RotateCcw className='w-4 h-4 text-gray-600' />
          </button>
        </div>

        <div className='grid grid-cols-3 gap-3 mb-3'>
          <div>
            <p className='text-xs text-gray-600'>Available</p>
            <p className='text-2xl font-bold text-indigo-600'>{stats.totalBalance}</p>
          </div>
          <div>
            <p className='text-xs text-gray-600'>Used This Month</p>
            <p className='text-2xl font-bold text-orange-600'>{stats.totalUsed}</p>
          </div>
          <div>
            <p className='text-xs text-gray-600'>Resets In</p>
            <p className='text-2xl font-bold text-green-600'>{daysUntilRefresh}d</p>
          </div>
        </div>

        {stats.totalBalance === 0 && (
          <div className='flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700'>
            <AlertCircle className='w-4 h-4' />
            <span>You're out of tokens. Upgrade your plan to get more.</span>
          </div>
        )}
      </div>

      {/* Token Types Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
        {stats.byType.map((token: any) => {
          const info =
            TOKEN_DISPLAY_INFO[token.token_type as keyof typeof TOKEN_DISPLAY_INFO];
          if (!info) return null;

          const Icon = info.icon;
          const percentage = token.total_allocated > 0 
            ? Math.round((token.balance / token.total_allocated) * 100)
            : 0;
          const isLow = token.balance < token.total_allocated * 0.2;

          return (
            <div
              key={token.token_type}
              className={`p-4 border rounded-lg bg-white ${
                isLow ? 'border-red-200' : 'border-gray-200'
              }`}
            >
              <div className='flex items-center gap-3 mb-3'>
                <div className={`p-2 bg-gradient-to-br ${info.color} rounded-lg`}>
                  <Icon className='w-5 h-5 text-white' />
                </div>
                <div className='flex-1'>
                  <p className='font-semibold text-gray-800'>{info.label}</p>
                  <p className='text-xs text-gray-600'>{info.description}</p>
                </div>
              </div>

              <div className='space-y-2'>
                {/* Balance & Percentage */}
                <div className='flex justify-between items-center'>
                  <div>
                    <p className='text-2xl font-bold text-gray-900'>{token.balance}</p>
                    <p className='text-xs text-gray-600'>
                      of {token.total_allocated} available
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className={`text-xl font-semibold ${
                      isLow ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {percentage}%
                    </p>
                    {isLow && (
                      <p className='text-xs text-red-600 flex items-center gap-1'>
                        <AlertCircle className='w-3 h-3' /> Low
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className='w-full bg-gray-200 rounded-full h-2'>
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isLow
                        ? 'bg-red-500'
                        : percentage > 50
                          ? 'bg-green-500'
                          : 'bg-yellow-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Usage Info */}
                <p className='text-xs text-gray-600'>
                  Used: <span className='font-semibold'>{token.total_used}</span> this month
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Footer */}
      <div className='p-3 bg-blue-50 border border-blue-200 rounded-lg'>
        <p className='text-xs text-blue-800'>
          💡 <strong>Tip:</strong> Tokens refresh monthly on your renewal date. Upgrade your plan
          to increase your token allocation.
        </p>
      </div>
    </div>
  );
}
