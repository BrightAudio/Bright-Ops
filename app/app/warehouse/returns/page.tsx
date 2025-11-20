"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";

type PullSheetWithDates = {
  id: string;
  job_id: string;
  job_code: string | null;
  job_title: string | null;
  expected_return_date: string | null;
  is_finalized: boolean;
  created_at: string;
  venue: string | null;
};

export default function ReturnsPage() {
  const [overduePullSheets, setOverduePullSheets] = useState<PullSheetWithDates[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState<string | null>(null);

  useEffect(() => {
    loadOverduePullSheets();
  }, []);

  async function loadOverduePullSheets() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString();
    
    const supabaseAny = supabase as any;
    const { data, error } = await supabaseAny
      .from('pull_sheets')
      .select(`
        id,
        job_id,
        expected_return_date,
        is_finalized,
        created_at,
        jobs!inner (
          code,
          title,
          venue
        )
      `)
      .eq('is_finalized', true)
      .not('expected_return_date', 'is', null)
      .lt('expected_return_date', todayString)
      .order('expected_return_date', { ascending: true });

    if (!error && data) {
      const formatted = data.map((ps: any) => ({
        id: ps.id,
        job_id: ps.job_id,
        job_code: ps.jobs?.code || null,
        job_title: ps.jobs?.title || null,
        expected_return_date: ps.expected_return_date,
        is_finalized: ps.is_finalized,
        created_at: ps.created_at,
        venue: ps.jobs?.venue || null
      }));
      console.log('All overdue finalized pull sheets:', formatted);
      setOverduePullSheets(formatted);
    } else if (error) {
      console.error('Error loading overdue pull sheets:', error);
    }
    setLoading(false);
  }

  async function archiveReturn(pullSheetId: string, jobTitle: string) {
    if (!confirm(`Archive "${jobTitle}"?\n\nThis will mark the pull sheet as returned.`)) {
      return;
    }

    setArchiving(pullSheetId);
    try {
      const supabaseAny = supabase as any;
      const { error } = await supabaseAny
        .from('pull_sheets')
        .update({ 
          status: 'returned',
          updated_at: new Date().toISOString()
        })
        .eq('id', pullSheetId);

      if (error) {
        console.error('Archive error:', error);
        throw error;
      }

      console.log('Pull sheet marked as returned:', pullSheetId);
      
      // Refresh the list
      await loadOverduePullSheets();
      alert('✅ Pull sheet marked as returned!');
    } catch (err) {
      console.error('Error archiving pull sheet:', err);
      alert(`Failed to archive: ${err}`);
    } finally {
      setArchiving(null);
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getDaysOverdue = (expectedDate: string | null) => {
    if (!expectedDate) return 0;
    const expected = new Date(expectedDate);
    const today = new Date();
    const diffTime = today.getTime() - expected.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Returns</h1>
            <p className="text-zinc-400">
              Jobs past their expected return date requiring equipment returns
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              loadOverduePullSheets();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors"
            disabled={loading}
          >
            <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'} mr-2`}></i>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="text-zinc-400">Loading...</div>
        ) : overduePullSheets.length === 0 ? (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-8 text-center">
            <div className="text-zinc-400 mb-2">
              <i className="fas fa-check-circle text-5xl text-green-500 mb-4"></i>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">All caught up!</h3>
            <p className="text-zinc-400">No finalized pull sheets currently overdue for returns</p>
          </div>
        ) : (
          <div className="space-y-4">
            {overduePullSheets.map((pullSheet) => {
              const daysOverdue = getDaysOverdue(pullSheet.expected_return_date);
              
              return (
                <div
                  key={pullSheet.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">{pullSheet.job_title || 'Untitled Job'}</h3>
                        <span className="text-sm font-mono text-amber-400">{pullSheet.job_code || 'N/A'}</span>
                        {daysOverdue > 0 && (
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            daysOverdue > 7 
                              ? 'bg-red-900 text-red-200' 
                              : 'bg-yellow-900 text-yellow-200'
                          }`}>
                            {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-4">
                        <div>
                          <div className="text-zinc-400 mb-1">Expected Return</div>
                          <div className="text-white font-semibold">
                            {formatDate(pullSheet.expected_return_date)}
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-400 mb-1">Pull Sheet Created</div>
                          <div className="text-white">
                            {formatDate(pullSheet.created_at)}
                          </div>
                        </div>
                        {pullSheet.venue && (
                          <div>
                            <div className="text-zinc-400 mb-1">Venue</div>
                            <div className="text-white">{pullSheet.venue}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/app/warehouse/pull-sheets/${pullSheet.id}`}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors"
                      >
                        <i className="fas fa-clipboard-list mr-2"></i>
                        View Pull Sheet
                      </Link>
                      <button
                        onClick={() => archiveReturn(pullSheet.id, pullSheet.job_title || 'Pull Sheet')}
                        disabled={archiving === pullSheet.id}
                        className={`px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors ${
                          archiving === pullSheet.id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <i className={`fas ${archiving === pullSheet.id ? 'fa-spinner fa-spin' : 'fa-archive'} mr-2`}></i>
                        {archiving === pullSheet.id ? 'Archiving...' : 'Mark Returned'}
                      </button>
                      <Link
                        href={`/app/jobs/${pullSheet.job_id}`}
                        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md transition-colors"
                      >
                        <i className="fas fa-eye mr-2"></i>
                        View Job
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
