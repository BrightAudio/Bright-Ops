'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { type Database } from '@/types/database';

type Job = Database['public']['Tables']['jobs']['Row'] & {
  clients: {
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
};

export default function JobDetailPage() {
  const params = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJob() {
      const id = Array.isArray(params.id) ? params.id[0] : params.id;
      if (!id) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          clients (
            name,
            email,
            phone
          )
        `)
        .eq('id', id)
        .single();
      if (!error && data) {
        setJob(data);
      }
      setLoading(false);
    }
    loadJob();
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-zinc-800 rounded"/>
          <div className="h-64 bg-zinc-800 rounded"/>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-center">
        <div className="text-zinc-400">Job not found</div>
        <Link 
          href="/jobs"
          className="mt-4 inline-block px-4 py-2 bg-amber-400 text-black rounded font-semibold"
        >
          Back to Jobs
        </Link>
      </div>
    );
  }

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-amber-400 mb-6">{job.code}</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="p-4 rounded bg-zinc-900">
            <div className="text-sm font-medium text-amber-300">Job Details</div>
            <div className="mt-2 space-y-2">
              <div>{job.title}</div>
              <div className="text-sm text-zinc-400">
                {formatDate(job.start_at)} → {formatDate(job.end_at)}
              </div>
              {job.venue && (
                <div className="text-sm text-zinc-400">
                  Venue: {job.venue}
                </div>
              )}
            </div>
          </div>

          {job.clients && (
            <div className="p-4 rounded bg-zinc-900">
              <div className="text-sm font-medium text-amber-300">Client</div>
              <div className="mt-2 space-y-1">
                <div>{job.clients.name}</div>
                {job.clients.email && (
                  <div className="text-sm text-zinc-400">
                    {job.clients.email}
                  </div>
                )}
                {job.clients.phone && (
                  <div className="text-sm text-zinc-400">
                    {job.clients.phone}
                  </div>
                )}
              </div>
            </div>
          )}

          {job.notes && (
            <div className="p-4 rounded bg-zinc-900">
              <div className="text-sm font-medium text-amber-300">Notes</div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">
                {job.notes}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={() => window.open(`/api/pullsheet?jobCode=${job.code}`, '_blank')}
            className="w-full px-4 py-2 bg-amber-400 text-black rounded font-semibold hover:bg-amber-500 transition-colors"
          >
            Generate Pull Sheet
          </button>
          
          <Link
            href={`/scan?job=${job.code}`}
            className="block w-full px-4 py-2 border border-zinc-700 rounded text-center hover:bg-zinc-800 transition-colors"
          >
            Scan Console
          </Link>

          <Link
            href="/jobs"
            className="block w-full px-4 py-2 border border-zinc-700 rounded text-center hover:bg-zinc-800 transition-colors"
          >
            Back to Jobs
          </Link>
        </div>
      </div>
    </div>
  );
}