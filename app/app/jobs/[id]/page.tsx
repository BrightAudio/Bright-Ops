'use client';
// @ts-nocheck

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/database';
import { createPullSheet, type PullSheet } from '@/lib/hooks/usePullSheets';
import DashboardLayout from '@/components/layout/DashboardLayout';

type Job = {
  id: string;
  title: string;
  code?: string;
  status: string;
  start_at?: string;
  end_at?: string;
  venue?: string;
  notes?: string;
  income?: number;
  labor_cost?: number;
  profit?: number;
  client_id?: string;
  clients?: {
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
  const [pullSheet, setPullSheet] = useState<PullSheet | null>(null);
  const [pullSheetLoading, setPullSheetLoading] = useState(false);
  const [pullSheetError, setPullSheetError] = useState<string | null>(null);
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeValue, setIncomeValue] = useState('');
  const [savingIncome, setSavingIncome] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'pullsheet' | 'crew' | 'financial' | 'timeline'>('overview');

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

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleString();
  };

  async function handleSaveIncome() {
    if (!job) return;
    setSavingIncome(true);
    try {
      const incomeNum = parseFloat(incomeValue) || 0;
      const { error } = await (supabase as any)
        .from('jobs')
        .update({ income: incomeNum })
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
      // Open the job-level prep sheet UI (create-mode). The prep sheet is the job-side form.
      router.push(`/app/warehouse/jobs/${job.id}/prep-sheet`);
    } catch (err) {
      setPullSheetError((err as Error).message);
    } finally {
      setPullSheetLoading(false);
    }
  }

  return (
    <DashboardLayout>
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">{job.title}</h1>
            <span className={`px-3 py-1 rounded text-sm font-medium ${
              job.status === 'complete' ? 'bg-green-900 text-green-200' :
              job.status === 'active' ? 'bg-blue-900 text-blue-200' :
              job.status === 'cancelled' ? 'bg-red-900 text-red-200' :
              'bg-zinc-700 text-zinc-300'
            }`}>
              {job.status}
            </span>
          </div>
          <div className="text-amber-400 font-mono">{job.code}</div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors">
            <i className="fas fa-edit mr-2"></i>Edit Job
          </button>
          <Link
            href="/app/jobs"
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>Back to Jobs
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-zinc-700 mb-6">
        <div className="flex gap-1">
          {[
            { id: 'overview' as const, label: 'Overview', icon: 'fa-info-circle' },
            { id: 'pullsheet' as const, label: 'CreatePullSheet', icon: 'fa-clipboard-list' },
            { id: 'crew' as const, label: 'Crew', icon: 'fa-users' },
            { id: 'financial' as const, label: 'Financial', icon: 'fa-dollar-sign' },
            { id: 'timeline' as const, label: 'Timeline', icon: 'fa-history' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <i className={`fas ${tab.icon} mr-2`}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Main Content */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <div className="p-6 rounded-lg bg-zinc-800 border border-zinc-700">
                <h2 className="text-lg font-semibold text-amber-300 mb-4 flex items-center gap-2">
                  <i className="fas fa-calendar-alt"></i>
                  Event Details
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-sm text-zinc-400 mb-1">Load Out Date</div>
                    <div className="text-white">{formatDate(job.start_at) || 'Not set'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-zinc-400 mb-1">Return Date</div>
                    <div className="text-white">{formatDate(job.end_at) || 'Not set'}</div>
                  </div>
                  {job.venue && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-zinc-400 mb-1">Venue/Location</div>
                      <div className="text-white">{job.venue}</div>
                    </div>
                  )}
                </div>
              </div>

              {job.clients && (
                <div className="p-6 rounded-lg bg-zinc-800 border border-zinc-700">
                  <h2 className="text-lg font-semibold text-amber-300 mb-4 flex items-center gap-2">
                    <i className="fas fa-user"></i>
                    Client Information
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-zinc-400 mb-1">Name</div>
                      <div className="text-white">{job.clients.name}</div>
                    </div>
                    {job.clients.email && (
                      <div>
                        <div className="text-sm text-zinc-400 mb-1">Email</div>
                        <a href={`mailto:${job.clients.email}`} className="text-amber-400 hover:text-amber-300">
                          {job.clients.email}
                        </a>
                      </div>
                    )}
                    {job.clients.phone && (
                      <div>
                        <div className="text-sm text-zinc-400 mb-1">Phone</div>
                        <a href={`tel:${job.clients.phone}`} className="text-amber-400 hover:text-amber-300">
                          {job.clients.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {job.notes && (
                <div className="p-6 rounded-lg bg-zinc-800 border border-zinc-700">
                  <h2 className="text-lg font-semibold text-amber-300 mb-4 flex items-center gap-2">
                    <i className="fas fa-sticky-note"></i>
                    Notes
                  </h2>
                  <div className="whitespace-pre-wrap text-zinc-300">{job.notes}</div>
                </div>
              )}
            </>
          )}

          {/* Pull Sheet Tab */}
          {activeTab === 'pullsheet' && (
            <div className="p-6 rounded-lg bg-zinc-800 border border-zinc-700">
              <h2 className="text-lg font-semibold text-amber-300 mb-4 flex items-center gap-2">
                <i className="fas fa-clipboard-list"></i>
                Pull Sheet Management
              </h2>
              <div className="space-y-4">
                <p className="text-zinc-400">
                  {pullSheet
                    ? 'A pull sheet exists for this job. Click below to view or edit it.'
                    : 'No pull sheet has been created yet. Create one to start managing equipment for this job.'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleOpenPullSheet}
                    className="px-6 py-3 bg-amber-400 text-black rounded-lg font-semibold hover:bg-amber-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                    disabled={pullSheetLoading}
                  >
                    <i className="fas fa-clipboard-list"></i>
                    {pullSheetLoading ? 'Opening…' : pullSheet ? 'Open Pull Sheet' : 'Create Pull Sheet'}
                  </button>
                  {pullSheet && (
                    <button
                      onClick={() => window.open(`/api/pullsheet?pullSheetId=${pullSheet.id}`, '_blank')}
                      className="px-6 py-3 border-2 border-amber-400 text-amber-400 rounded-lg font-semibold hover:bg-amber-400/10 transition-colors flex items-center gap-2"
                    >
                      <i className="fas fa-file-pdf"></i>
                      View PDF
                    </button>
                  )}
                </div>
                {pullSheetError && (
                  <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    {pullSheetError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Crew Tab */}
          {activeTab === 'crew' && (
            <div className="p-6 rounded-lg bg-zinc-800 border border-zinc-700">
              <h2 className="text-lg font-semibold text-amber-300 mb-4 flex items-center gap-2">
                <i className="fas fa-users"></i>
                Crew Management
              </h2>
              <p className="text-zinc-400 mb-4">Crew scheduling feature coming soon.</p>
              <button className="px-4 py-2 bg-amber-400 text-black rounded hover:bg-amber-500 font-semibold">
                <i className="fas fa-plus mr-2"></i>
                Assign Crew Member
              </button>
            </div>
          )}

          {/* Financial Tab */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              <div className="p-6 rounded-lg bg-zinc-800 border border-zinc-700">
                <h2 className="text-lg font-semibold text-amber-300 mb-4 flex items-center gap-2">
                  <i className="fas fa-dollar-sign"></i>
                  Financial Summary
                </h2>
                <div className="space-y-4">
                  {/* Income */}
                  <div className="flex justify-between items-center p-4 bg-zinc-900 rounded">
                    <span className="text-zinc-300 font-medium">Income:</span>
                    {editingIncome ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={incomeValue}
                          onChange={(e) => setIncomeValue(e.target.value)}
                          className="w-32 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-right"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveIncome}
                          disabled={savingIncome}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                        >
                          {savingIncome ? '...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingIncome(false);
                            setIncomeValue((job as any).income?.toString() || '0');
                          }}
                          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl text-green-400 font-bold">
                          ${parseFloat((job as any).income || 0).toFixed(2)}
                        </span>
                        <button
                          onClick={() => setEditingIncome(true)}
                          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Labor Cost */}
                  <div className="flex justify-between p-4 bg-zinc-900 rounded">
                    <span className="text-zinc-300 font-medium">Labor Cost:</span>
                    <span className="text-2xl text-red-400 font-bold">
                      ${parseFloat((job as any).labor_cost || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Profit */}
                  <div className="flex justify-between p-4 bg-zinc-900 rounded border-2 border-zinc-700">
                    <span className="text-white text-lg font-semibold">Net Profit:</span>
                    <span className={`text-3xl font-bold ${parseFloat((job as any).profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${parseFloat((job as any).profit || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg bg-zinc-800 border border-zinc-700">
                <h2 className="text-lg font-semibold text-amber-300 mb-4">Invoice</h2>
                <Link
                  href={`/app/jobs/${job.id}/estimate`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                >
                  <i className="fas fa-file-invoice-dollar"></i>
                  View Cost Estimate & Invoice
                </Link>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="p-6 rounded-lg bg-zinc-800 border border-zinc-700">
              <h2 className="text-lg font-semibold text-amber-300 mb-4 flex items-center gap-2">
                <i className="fas fa-history"></i>
                Activity Timeline
              </h2>
              <p className="text-zinc-400">Activity logging feature coming soon.</p>
            </div>
          )}
        </div>

        {/* Right Column - Actions */}
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
          <Link
            href={`/app/jobs/${job.id}/estimate`}
            className="block w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold transition-colors text-center"
          >
            <i className="fas fa-file-invoice-dollar mr-2"></i>
            Invoice
          </Link>

          <button
            onClick={handleOpenPullSheet}
            className="w-full px-4 py-2 bg-amber-400 text-black rounded font-semibold hover:bg-amber-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={pullSheetLoading}
          >
            {pullSheetLoading ? 'Opening…' : pullSheet ? 'Open Pull Sheet' : 'CreatePullSheet'}
          </button>

          <Link
            href={`/app/warehouse/returns?job=${job.id}`}
            className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors text-center flex items-center justify-center gap-2"
          >
            <i className="fas fa-undo"></i>
            Returns
          </Link>

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
            className="block w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <i className="fas fa-truck"></i>
            Transport
          </Link>

          <button
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition-colors flex items-center justify-center gap-2"
            onClick={() => {
              if (confirm('Are you sure you want to archive this job?')) {
                console.log('Archive job:', job.id);
              }
            }}
          >
            <i className="fas fa-archive"></i>
            Archive
          </button>

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