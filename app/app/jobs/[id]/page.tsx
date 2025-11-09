'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { type Database } from '@/types/database';
import { createPullSheet } from '@/lib/hooks/usePullSheets';
import DashboardLayout from '@/components/layout/DashboardLayout';

type Job = Database['public']['Tables']['jobs']['Row'] & {
  clients: {
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [pullSheet, setPullSheet] = useState<Database['public']['Tables']['pull_sheets']['Row'] | null>(null);
  const [pullSheetLoading, setPullSheetLoading] = useState(false);
  const [pullSheetError, setPullSheetError] = useState<string | null>(null);
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeValue, setIncomeValue] = useState('');
  const [savingIncome, setSavingIncome] = useState(false);

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
        setIncomeValue((data as any).income?.toString() || '0');
      }
      setLoading(false);
    }
    loadJob();
  }, [params.id]);

  useEffect(() => {
    async function loadPullSheet(jobId: string) {
      const { data } = await supabase
        .from('pull_sheets')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setPullSheet(data ?? null);
    }
    if (job?.id) {
      loadPullSheet(job.id);
    }
  }, [job?.id]);

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
      <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto text-center">
        <div className="text-zinc-400">Job not found</div>
        <Link 
          href="/app/jobs"
          className="mt-4 inline-block px-4 py-2 bg-amber-400 text-black rounded font-semibold"
        >
          Back to Jobs
        </Link>
      </div>
      </DashboardLayout>
    );
  }

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleString();
  };

  async function handleSaveIncome() {
    if (!job) return;
    setSavingIncome(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ income: parseFloat(incomeValue) || 0 })
        .eq('id', job.id);

      if (error) throw error;

      // Reload job to get updated labor_cost and profit
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', job.id)
        .single();

      if (data) {
        setJob({ ...job, ...(data as any) });
      }
      setEditingIncome(false);
    } catch (err) {
      console.error('Error saving income:', err);
      alert('Failed to save income');
    } finally {
      setSavingIncome(false);
    }
  }

  async function handleOpenPullSheet() {
    if (!job) return;
    setPullSheetLoading(true);
    setPullSheetError(null);
    try {
      if (pullSheet) {
  router.push(`/app/warehouse/pull-sheets/${pullSheet.id}`);
        return;
      }
      const created = await createPullSheet({
        name: `${job.code ?? job.title ?? 'Job'} Pull Sheet`,
        job_id: job.id,
        status: 'draft',
        scheduled_out_at: job.start_at ?? null,
        expected_return_at: job.end_at ?? null,
        notes: job.notes ?? null,
      });
      setPullSheet(created);
  router.push(`/app/warehouse/pull-sheets/${created.id}`);
    } catch (err) {
      setPullSheetError((err as Error).message);
    } finally {
      setPullSheetLoading(false);
    }
  }

  return (
    <DashboardLayout>
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

          {/* Financial Summary */}
          <div className="p-4 rounded bg-zinc-900">
            <div className="text-sm font-medium text-amber-300 mb-3">Financial Summary</div>
            <div className="space-y-2">
              {/* Income */}
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Income:</span>
                {editingIncome ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={incomeValue}
                      onChange={(e) => setIncomeValue(e.target.value)}
                      className="w-32 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-right"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveIncome}
                      disabled={savingIncome}
                      className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                    >
                      {savingIncome ? '...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingIncome(false);
                        setIncomeValue((job as any).income?.toString() || '0');
                      }}
                      className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 font-semibold">
                      ${parseFloat((job as any).income || 0).toFixed(2)}
                    </span>
                    <button
                      onClick={() => setEditingIncome(true)}
                      className="text-amber-400 hover:text-amber-300 text-sm"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                  </div>
                )}
              </div>

              {/* Labor Cost */}
              <div className="flex justify-between">
                <span className="text-zinc-400">Labor Cost:</span>
                <span className="text-red-400">
                  ${parseFloat((job as any).labor_cost || 0).toFixed(2)}
                </span>
              </div>

              {/* Profit */}
              <div className="flex justify-between border-t border-zinc-700 pt-2 mt-2">
                <span className="text-zinc-300 font-semibold">Profit:</span>
                <span className={`font-bold ${parseFloat((job as any).profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${parseFloat((job as any).profit || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setEditingIncome(true)}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <i className="fas fa-dollar-sign"></i>
            {parseFloat((job as any).income || 0) > 0 ? 'Edit Income' : 'Add Income'}
          </button>

          <button
            onClick={handleOpenPullSheet}
            className="w-full px-4 py-2 bg-amber-400 text-black rounded font-semibold hover:bg-amber-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={pullSheetLoading}
          >
            {pullSheetLoading ? 'Opening…' : pullSheet ? 'Open Pull Sheet' : 'Create Pull Sheet'}
          </button>

          {pullSheet && (
            <button
              onClick={() => window.open(`/api/pullsheet?pullSheetId=${pullSheet.id}`, '_blank')}
              className="w-full px-4 py-2 border border-amber-500/40 text-amber-200 rounded font-semibold hover:bg-amber-500/10 transition-colors"
            >
              View Latest Pull Sheet PDF
            </button>
          )}

          {pullSheetError && (
            <div className="rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {pullSheetError}
            </div>
          )}
          
          <Link
            href={`/app/warehouse/transports?job=${job.id}`}
            className="block w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-center hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
          >
            <i className="fas fa-truck"></i>
            Manage Transports
          </Link>

          <Link
            href={`/app/scan?job=${job.code}`}
            className="block w-full px-4 py-2 border border-zinc-700 rounded text-center hover:bg-zinc-800 transition-colors"
          >
            Scan Console
          </Link>

          <Link
            href="/app/jobs"
            className="block w-full px-4 py-2 border border-zinc-700 rounded text-center hover:bg-zinc-800 transition-colors"
          >
            Back to Jobs
          </Link>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}