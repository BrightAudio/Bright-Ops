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
  expected_return_at: string | null;
  finalized_at: string | null;
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
        expected_return_at,
        finalized_at,
        created_at,
        jobs!inner (
          code,
          title,
          venue
        )
      `)
      .not('finalized_at', 'is', null)
      .neq('status', 'returned')
      .not('expected_return_at', 'is', null)
      .lt('expected_return_at', todayString)
      .order('expected_return_at', { ascending: true });

    if (!error && data) {
      const formatted = data.map((ps: any) => ({
        id: ps.id,
        job_id: ps.job_id,
        job_code: ps.jobs?.code || null,
        job_title: ps.jobs?.title || null,
        expected_return_at: ps.expected_return_at,
        finalized_at: ps.finalized_at,
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
          <div className="overflow-x-auto rounded-xl border border-gray-300 bg-gray-400 shadow-lg">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-900 font-bold bg-gray-300">
                  <th className="px-6 py-4">Job Code</th>
                  <th className="px-6 py-4">Job Title</th>
                  <th className="px-6 py-4">Venue</th>
                  <th className="px-6 py-4">Expected Return</th>
                  <th className="px-6 py-4">Days Overdue</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm bg-white">
                {overduePullSheets.map((pullSheet) => {
                  const daysOverdue = getDaysOverdue(pullSheet.expected_return_at);
                  
                  return (
                    <tr key={pullSheet.id} className="border-t border-gray-300 hover:bg-amber-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {pullSheet.job_code || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-medium">
                        {pullSheet.job_title || 'Untitled Job'}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {pullSheet.venue || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900 font-semibold">
                          {formatDate(pullSheet.expected_return_at)}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Created: {formatDate(pullSheet.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {daysOverdue > 0 && (
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            daysOverdue > 7 
                              ? 'bg-red-500/20 text-red-700 border border-red-400/40' 
                              : 'bg-yellow-500/20 text-yellow-700 border border-yellow-400/40'
                          }`}>
                            {daysOverdue} day{daysOverdue !== 1 ? 's' : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/app/warehouse/jobs/${pullSheet.job_id}/return-manifest`}
                            className="px-4 py-2 rounded-lg border-2 border-purple-600 text-purple-700 font-semibold bg-purple-50 hover:bg-purple-600 hover:text-white transition-all"
                          >
                            Process Return
                          </Link>
                          <Link
                            href={`/app/jobs/${pullSheet.job_id}`}
                            className="px-4 py-2 rounded-lg border-2 border-gray-700 text-gray-900 font-semibold hover:bg-amber-400 hover:border-amber-500 transition-all"
                          >
                            View Job
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
