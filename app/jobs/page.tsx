'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { type Database } from '@/types/database';

type Job = Database['public']['Tables']['jobs']['Row'] & {
  clients: {
    name: string;
  } | null;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadJobs() {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          clients (
            name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setJobs(data);
      }
      setLoading(false);
    }
    loadJobs();
  }, []);

  const filtered = jobs.filter(j => 
    j.code.toLowerCase().includes(search.toLowerCase()) ||
    j.title?.toLowerCase().includes(search.toLowerCase()) ||
    j.venue?.toLowerCase().includes(search.toLowerCase()) ||
    j.clients?.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-amber-400">Jobs</h1>
        <Link 
          href="/jobs/new"
          className="px-4 py-2 bg-amber-400 text-black rounded font-semibold hover:bg-amber-500 transition-colors"
        >
          New Job
        </Link>
      </div>

      <input
        type="search"
        placeholder="Search jobs..."
        className="w-full mb-4 px-4 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded bg-zinc-800"/>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-zinc-400">
          No jobs found
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(job => (
            <Link 
              key={job.id}
              href={`/jobs/${job.id}`}
              className="p-4 rounded bg-zinc-900 border border-zinc-800 hover:border-amber-400/30 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-amber-300">{job.code}</div>
                  <div className="text-white">{job.title}</div>
                  {job.clients?.name && (
                    <div className="text-sm text-zinc-400">
                      Client: {job.clients.name}
                    </div>
                  )}
                </div>
                <div className="text-right text-sm text-zinc-400">
                  <div>{formatDate(job.start_at)}</div>
                  <div>{job.venue}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}