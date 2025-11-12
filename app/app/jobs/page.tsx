"use client";
import { useState } from "react";
import { useJobs, createJob } from "@/lib/hooks/useJobs";
import { createPullSheet } from "@/lib/hooks/usePullSheets";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, FileText, Undo2, Truck } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";

const STATUS_OPTIONS = [
  { value: "all", label: "All Jobs" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "complete", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function JobsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", title: "", client: "" });
  const [creating, setCreating] = useState(false);
  const [creatingPullSheet, setCreatingPullSheet] = useState<string | null>(null);
  const { data: jobs, loading, reload } = useJobs({ search, status });

  // Calculate summary stats
  const stats = {
    thisWeek: jobs?.filter(job => {
      const startDate = job.start_at ? new Date(job.start_at) : null;
      if (!startDate) return false;
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return startDate >= weekAgo && startDate <= weekAhead;
    }).length || 0,
    inProgress: jobs?.filter(job => job.status === 'active').length || 0,
    upcoming: jobs?.filter(job => {
      const startDate = job.start_at ? new Date(job.start_at) : null;
      if (!startDate) return false;
      return startDate > new Date();
    }).length || 0,
    revenue: jobs?.reduce((sum, job) => sum + (parseFloat((job as any).income || '0') || 0), 0) || 0
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createJob(form);
      setForm({ code: "", title: "", client: "" });
      setShowForm(false);
      reload();
    } finally {
      setCreating(false);
    }
  }

  async function handlePullSheetClick(e: React.MouseEvent, job: any) {
    e.preventDefault();
    e.stopPropagation();
    
    setCreatingPullSheet(job.id);
    
    try {
      // Check if pull sheet already exists
      const { data: existingPullSheet } = await supabase
        .from('pull_sheets')
        .select('id')
        .eq('job_id', job.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as { data: { id: string } | null };
      
      if (existingPullSheet?.id) {
        // Open existing pull sheet
        router.push(`/app/warehouse/pull-sheets/${existingPullSheet.id}`);
      } else {
        // Create new pull sheet
        const created = await createPullSheet({
          name: `${job.code ?? job.title ?? 'Job'} Pull Sheet`,
          job_id: job.id,
          status: 'draft',
          scheduled_out_at: job.start_at ?? null,
          expected_return_at: job.end_at ?? null,
          notes: job.notes ?? null,
        });
        router.push(`/app/warehouse/pull-sheets/${created.id}`);
      }
    } catch (err) {
      console.error('Error creating pull sheet:', err);
      alert('Failed to create pull sheet');
    } finally {
      setCreatingPullSheet(null);
    }
  }

  return (
    <DashboardLayout>
      <div className="bg-zinc-900 text-gray-100 p-6">
      
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
          <div className="text-zinc-400 text-sm mb-1">This Week</div>
          <div className="text-2xl font-bold text-white">{stats.thisWeek}</div>
          <div className="text-xs text-zinc-500 mt-1">Jobs scheduled</div>
        </div>
        <div className="bg-zinc-800 border border-blue-700/50 rounded-lg p-4">
          <div className="text-zinc-400 text-sm mb-1">In Progress</div>
          <div className="text-2xl font-bold text-blue-400">{stats.inProgress}</div>
          <div className="text-xs text-zinc-500 mt-1">Active jobs</div>
        </div>
        <div className="bg-zinc-800 border border-amber-700/50 rounded-lg p-4">
          <div className="text-zinc-400 text-sm mb-1">Upcoming</div>
          <div className="text-2xl font-bold text-amber-400">{stats.upcoming}</div>
          <div className="text-xs text-zinc-500 mt-1">Future jobs</div>
        </div>
        <div className="bg-zinc-800 border border-green-700/50 rounded-lg p-4">
          <div className="text-zinc-400 text-sm mb-1">Total Revenue</div>
          <div className="text-2xl font-bold text-green-400">${stats.revenue.toFixed(2)}</div>
          <div className="text-xs text-zinc-500 mt-1">All jobs</div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex border border-zinc-700 rounded overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              <i className="fas fa-th"></i>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              <i className="fas fa-list"></i>
            </button>
          </div>
          <Link
            href="/app/clients"
            className="flex items-center gap-2 bg-zinc-800 text-white px-4 py-2 rounded hover:bg-zinc-700 border border-zinc-700"
          >
            <i className="fas fa-users"></i> Clients
          </Link>
          <button
            className="flex items-center gap-2 bg-amber-500 text-black px-4 py-2 rounded hover:bg-amber-400"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus size={18} /> New Job
          </button>
        </div>
      </div>
      {showForm && (
        <form
          className="bg-zinc-800 p-4 rounded mb-6 flex gap-4 items-end"
          onSubmit={handleCreate}
        >
          <input
            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
            placeholder="Code"
            value={form.code}
            onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
            required
          />
          <input
            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
            placeholder="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />
          <input
            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
            placeholder="Client"
            value={form.client}
            onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
            required
          />
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500"
            disabled={creating}
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
      )}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-white"
            placeholder="Search jobs by code or title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-white"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <p className="text-zinc-500">Loading jobs...</p>
      ) : !jobs || jobs.length === 0 ? (
        <p className="text-zinc-500">No jobs found. Create one to get started!</p>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
          {jobs.map(job => (
            <div
              key={job.id}
              className={`bg-zinc-800 border border-zinc-700 rounded p-4 hover:border-amber-500 transition-colors ${
                viewMode === 'list' ? 'flex items-center gap-4' : ''
              }`}
            >
              <Link href={`/app/jobs/${job.id}`} className={viewMode === 'list' ? 'flex-1 flex items-center gap-4' : 'block'}>
                <div className={viewMode === 'list' ? 'flex items-center gap-4 flex-1' : ''}>
                  <div className={viewMode === 'list' ? 'min-w-[200px]' : 'mb-2'}>
                    <div className="text-amber-400 font-mono text-sm">{job.code}</div>
                    <h3 className="font-semibold text-lg">{job.title}</h3>
                    {job.client_name && (
                      <div className="text-sm text-zinc-400">Client: {job.client_name}</div>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    job.status === 'complete' ? 'bg-green-900 text-green-200' :
                    job.status === 'active' ? 'bg-blue-900 text-blue-200' :
                    'bg-zinc-700 text-zinc-300'
                  }`}>
                    {job.status}
                  </span>
                </div>
                
                {/* Financial Summary */}
                {(job.income || job.labor_cost || job.profit !== undefined) && (
                  <div className={`bg-zinc-900 rounded p-3 space-y-1 text-sm ${viewMode === 'list' ? 'min-w-[300px]' : 'mb-3'}`}>
                    {job.income !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Income:</span>
                        <span className="text-green-400 font-semibold">${parseFloat(job.income || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {job.labor_cost !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Labor Cost:</span>
                        <span className="text-red-400">${parseFloat(job.labor_cost || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {job.profit !== undefined && (
                      <div className="flex justify-between border-t border-zinc-700 pt-1 mt-1">
                        <span className="text-zinc-300 font-semibold">Profit:</span>
                        <span className={`font-bold ${parseFloat(job.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${parseFloat(job.profit || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </Link>
              <div className={`flex gap-2 text-xs text-zinc-500 ${viewMode === 'list' ? '' : 'mt-3'}`}>
                <Link
                  href={`/app/jobs/${job.id}/estimate`}
                  className="flex items-center gap-1 hover:text-purple-400 transition-colors"
                >
                  <i className="fas fa-file-invoice-dollar"></i>
                  <span>Invoice</span>
                </Link>
                <button
                  onClick={(e) => handlePullSheetClick(e, job)}
                  disabled={creatingPullSheet === job.id}
                  className="flex items-center gap-1 hover:text-amber-400 transition-colors disabled:opacity-50"
                >
                  <FileText size={14} />
                  <span>{creatingPullSheet === job.id ? 'Creating...' : 'Pull Sheet'}</span>
                </button>
                <Link 
                  href={`/app/warehouse/return-manifest?job=${job.id}`}
                  className="flex items-center gap-1 hover:text-amber-400 transition-colors"
                >
                  <Undo2 size={14} />
                  <span>Returns</span>
                </Link>
                <Link 
                  href={`/app/warehouse/transports?job=${job.id}`}
                  className="flex items-center gap-1 hover:text-amber-400 transition-colors"
                >
                  <Truck size={14} />
                  <span>Transport</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
