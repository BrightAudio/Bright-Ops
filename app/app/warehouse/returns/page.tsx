"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";

type JobWithDates = {
  id: string;
  code: string;
  title: string;
  expected_return_date: string | null;
  load_out_date: string | null;
  status: string | null;
  venue: string | null;
};

export default function ReturnsPage() {
  const [overdueJobs, setOverdueJobs] = useState<JobWithDates[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState<string | null>(null);

  useEffect(() => {
    loadOverdueJobs();
  }, []);

  async function loadOverdueJobs() {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    const todayString = today.toISOString();
    
    const { data, error } = await supabase
      .from('jobs')
      .select('id, code, title, expected_return_date, load_out_date, status, venue')
      .not('expected_return_date', 'is', null)
      .lte('expected_return_date', todayString)
      .or('status.is.null,status.neq.completed,status.neq.returned,status.neq.archived')
      .order('expected_return_date', { ascending: true });

    if (!error && data) {
      console.log('Loaded overdue jobs:', data);
      setOverdueJobs(data);
    } else if (error) {
      console.error('Error loading overdue jobs:', error);
    }
    setLoading(false);
  }

  async function archiveReturn(jobId: string) {
    if (!confirm('Archive this return? This will mark the job as returned and remove it from this list.')) {
      return;
    }

    setArchiving(jobId);
    try {
      const supabaseAny = supabase as any;
      const { error } = await supabaseAny
        .from('jobs')
        .update({ status: 'returned' })
        .eq('id', jobId);

      if (error) throw error;

      // Refresh the list
      await loadOverdueJobs();
      alert('✅ Return archived successfully!');
    } catch (err) {
      console.error('Error archiving return:', err);
      alert('Failed to archive return. Please try again.');
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
              loadOverdueJobs();
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
        ) : overdueJobs.length === 0 ? (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-8 text-center">
            <div className="text-zinc-400 mb-2">
              <i className="fas fa-check-circle text-5xl text-green-500 mb-4"></i>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">All caught up!</h3>
            <p className="text-zinc-400">No jobs currently overdue for returns</p>
          </div>
        ) : (
          <div className="space-y-4">
            {overdueJobs.map((job) => {
              const daysOverdue = getDaysOverdue(job.expected_return_date);
              
              return (
                <div
                  key={job.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">{job.title}</h3>
                        <span className="text-sm font-mono text-amber-400">{job.code}</span>
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

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                        <div>
                          <div className="text-zinc-400 mb-1">Expected Return</div>
                          <div className="text-white font-semibold">
                            {formatDate(job.expected_return_date)}
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-400 mb-1">Load Out Date</div>
                          <div className="text-white">
                            {formatDate(job.load_out_date)}
                          </div>
                        </div>
                        {job.venue && (
                          <div className="col-span-2">
                            <div className="text-zinc-400 mb-1">Venue</div>
                            <div className="text-white">{job.venue}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/app/warehouse/jobs/${job.id}/return-manifest`}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold transition-colors"
                      >
                        <i className="fas fa-clipboard-check mr-2"></i>
                        Process Return
                      </Link>
                      <button
                        onClick={() => archiveReturn(job.id)}
                        disabled={archiving === job.id}
                        className={`px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors ${
                          archiving === job.id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <i className={`fas ${archiving === job.id ? 'fa-spinner fa-spin' : 'fa-check-circle'} mr-2`}></i>
                        {archiving === job.id ? 'Archiving...' : 'Archive Return'}
                      </button>
                      <Link
                        href={`/app/jobs/${job.id}`}
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
