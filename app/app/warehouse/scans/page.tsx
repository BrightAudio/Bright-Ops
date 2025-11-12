"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import { Barcode, Package, Undo2, CheckCircle, Clock } from "lucide-react";

type Scan = {
  id: string;
  pull_sheet_id: string;
  barcode: string;
  scan_type: 'pull' | 'return' | 'verify';
  scanned_by: string | null;
  scanned_at: string;
  notes: string | null;
  pull_sheets?: {
    name: string;
    job_id: string | null;
  };
  inventory_items?: {
    name: string;
    category: string | null;
  };
  pull_sheet_items?: {
    item_name: string;
    qty_requested: number;
    qty_pulled: number;
  };
};

export default function RecentScansPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pull' | 'return' | 'verify'>('all');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  useEffect(() => {
    loadScans();
  }, [filter, timeRange]);

  async function loadScans() {
    setLoading(true);
    try {
      let query = supabase
        .from('pull_sheet_scans')
        .select(`
          *,
          pull_sheets (name, job_id),
          inventory_items (name, category),
          pull_sheet_items (item_name, qty_requested, qty_pulled)
        `)
        .order('scanned_at', { ascending: false })
        .limit(100);

      // Apply filter
      if (filter !== 'all') {
        query = query.eq('scan_type', filter);
      }

      // Apply time range filter
      if (timeRange !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        if (timeRange === 'today') {
          startDate.setHours(0, 0, 0, 0);
        } else if (timeRange === 'week') {
          startDate.setDate(now.getDate() - 7);
        } else if (timeRange === 'month') {
          startDate.setMonth(now.getMonth() - 1);
        }
        
        query = query.gte('scanned_at', startDate.toISOString());
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setScans((data as any[]) || []);
    } catch (err) {
      console.error('Error loading scans:', err);
    } finally {
      setLoading(false);
    }
  }

  function getScanIcon(scanType: string) {
    switch (scanType) {
      case 'pull':
        return <Package className="text-blue-400" size={20} />;
      case 'return':
        return <Undo2 className="text-green-400" size={20} />;
      case 'verify':
        return <CheckCircle className="text-purple-400" size={20} />;
      default:
        return <Barcode className="text-gray-400" size={20} />;
    }
  }

  function getScanBadgeColor(scanType: string) {
    switch (scanType) {
      case 'pull':
        return 'bg-blue-500/20 text-blue-200 border-blue-400/40';
      case 'return':
        return 'bg-green-500/20 text-green-200 border-green-400/40';
      case 'verify':
        return 'bg-purple-500/20 text-purple-200 border-purple-400/40';
      default:
        return 'bg-gray-500/20 text-gray-200 border-gray-400/40';
    }
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  const scanStats = {
    total: scans.length,
    pulls: scans.filter(s => s.scan_type === 'pull').length,
    returns: scans.filter(s => s.scan_type === 'return').length,
    verifies: scans.filter(s => s.scan_type === 'verify').length,
  };

  return (
    <DashboardLayout>
      <div className="bg-zinc-900 text-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Barcode size={28} />
            Recent Scans
          </h1>
          <button
            onClick={loadScans}
            className="flex items-center gap-2 bg-amber-500 text-black px-4 py-2 rounded hover:bg-amber-400"
          >
            <Clock size={18} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <div className="text-zinc-400 text-sm mb-1">Total Scans</div>
            <div className="text-2xl font-bold text-white">{scanStats.total}</div>
          </div>
          <div className="bg-zinc-800 border border-blue-700/50 rounded-lg p-4">
            <div className="text-zinc-400 text-sm mb-1">Pulled</div>
            <div className="text-2xl font-bold text-blue-400">{scanStats.pulls}</div>
          </div>
          <div className="bg-zinc-800 border border-green-700/50 rounded-lg p-4">
            <div className="text-zinc-400 text-sm mb-1">Returned</div>
            <div className="text-2xl font-bold text-green-400">{scanStats.returns}</div>
          </div>
          <div className="bg-zinc-800 border border-purple-700/50 rounded-lg p-4">
            <div className="text-zinc-400 text-sm mb-1">Verified</div>
            <div className="text-2xl font-bold text-purple-400">{scanStats.verifies}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-white"
          >
            <option value="all">All Types</option>
            <option value="pull">Pulls Only</option>
            <option value="return">Returns Only</option>
            <option value="verify">Verify Only</option>
          </select>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-white"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* Scans List */}
        {loading ? (
          <p className="text-zinc-500">Loading scans...</p>
        ) : scans.length === 0 ? (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-8 text-center">
            <Barcode size={48} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-500">No scans found for the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scans.map(scan => (
              <div
                key={scan.id}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-amber-500 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getScanIcon(scan.scan_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {scan.inventory_items?.name || scan.pull_sheet_items?.item_name || 'Unknown Item'}
                        </h3>
                        {scan.pull_sheets?.name && (
                          <Link
                            href={`/app/warehouse/pull-sheets/${scan.pull_sheet_id}`}
                            className="text-sm text-amber-400 hover:text-amber-300"
                          >
                            {scan.pull_sheets.name}
                          </Link>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded text-xs font-medium border ${getScanBadgeColor(scan.scan_type)}`}>
                        {scan.scan_type.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-zinc-400">
                      <div>
                        <span className="font-mono bg-zinc-900 px-2 py-1 rounded text-amber-400">
                          {scan.barcode}
                        </span>
                      </div>
                      {scan.scanned_by && (
                        <div>
                          Scanned by: <span className="text-white">{scan.scanned_by}</span>
                        </div>
                      )}
                      <div className="text-right md:text-left">
                        <Clock size={14} className="inline mr-1" />
                        {formatTimeAgo(scan.scanned_at)}
                      </div>
                    </div>
                    {scan.notes && (
                      <div className="mt-2 text-sm text-zinc-400 italic">
                        Note: {scan.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
