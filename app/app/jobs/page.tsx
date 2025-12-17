"use client";
// @ts-nocheck
import { useState, useEffect } from "react";
import { useJobs, createJob } from "@/lib/hooks/useJobs";
import { createPullSheet } from "@/lib/hooks/usePullSheets";
import { useLocation } from "@/lib/contexts/LocationContext";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, FileText, Undo2, Truck, X } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";

const STATUS_OPTIONS = [
  { value: "all", label: "All Jobs" },
  { value: "planned", label: "Planned" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

export default function JobsPage() {
  const router = useRouter();
  const { currentLocation } = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "planned" | "confirmed" | "completed" | "canceled">("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showArchived, setShowArchived] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({ code: "", title: "", client: "", startDate: "", endDate: "" });
  const [creating, setCreating] = useState(false);
  const [creatingPullSheet, setCreatingPullSheet] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  
  // Client/Venue info state
  const [showClientInfoSection, setShowClientInfoSection] = useState(false);
  const [clientForm, setClientForm] = useState({ phone: "", email: "", venueId: "" });
  const [venues, setVenues] = useState<any[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  
  const { data: allJobs, loading, reload } = useJobs({ search, status });
  
  // Filter jobs by archived status
  const jobs = allJobs?.filter(job => showArchived ? (job as any).archived === true : !(job as any).archived);
  
  // Load venues for dropdown
  useEffect(() => {
    async function loadVenues() {
      setLoadingVenues(true);
      try {
        const { data, error } = await supabase
          .from('venues')
          .select('id, name, address, city, state')
          .order('name');
        if (error) throw error;
        setVenues(data || []);
      } catch (err) {
        console.error('Error loading venues:', err);
      } finally {
        setLoadingVenues(false);
      }
    }
    loadVenues();
  }, []);

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
    
    // Check if client already exists
    const { data: existingClient } = await (supabase
      .from('clients') as any)
      .select('id, name, email, phone')
      .ilike('name', form.client.trim())
      .maybeSingle();
    
    if (!existingClient) {
      // New client - show inline section to collect phone, email, venue
      setShowClientInfoSection(true);
    } else {
      // Existing client - create job directly
      await createJobWithClient(existingClient.id, null);
    }
  }
  
  async function handleClientInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    
    try {
      // Create new client
      const { data: newClient, error: clientError } = await (supabase
        .from('clients') as any)
        .insert([{
          name: form.client.trim(),
          phone: clientForm.phone.trim() || null,
          email: clientForm.email.trim() || null,
        }])
        .select()
        .single();
      
      if (clientError) throw clientError;
      
      // Link client to venue if selected
      if (clientForm.venueId) {
        await (supabase
          .from('client_venues') as any)
          .insert([{
            client_id: newClient.id,
            venue_id: clientForm.venueId,
            is_primary: true,
          }]);
      }
      
      // Create job with new client
      await createJobWithClient(newClient.id, clientForm.venueId || null);
      
      // Close inline sections and reset
      setShowClientInfoSection(false);
      setClientForm({ phone: "", email: "", venueId: "" });
    } catch (err) {
      console.error('Error creating client:', err);
      alert('Failed to create client: ' + (err as Error).message);
    } finally {
      setCreating(false);
    }
  }
  
  async function createJobWithClient(clientId: string, venueId: string | null) {
    setCreating(true);
    try {
      const jobData: any = {
        code: form.code.trim(),
        title: form.title.trim() || null,
        client: form.client.trim(),
        client_id: clientId,
        venue_id: venueId,
        start_at: form.startDate || null,
        end_at: form.endDate || null,
        status: 'draft',
        warehouse: currentLocation === 'All Locations' ? 'NEW SOUND Warehouse' : currentLocation,
      };
      
      const newJob = await createJob(jobData);
      
      // Reset form and close inline form
      setForm({ code: "", title: "", client: "", startDate: "", endDate: "" });
      setShowCreateForm(false);
      
      // Redirect to job detail page
      if (newJob?.id) {
        router.push(`/app/jobs/${newJob.id}`);
      } else {
        reload();
      }
    } catch (err) {
      console.error('Error creating job:', err);
      alert('Failed to create job: ' + (err as Error).message);
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
        // Create new pull sheet - inherit warehouse_id from job
        const created = await createPullSheet({
          name: `${job.code ?? job.title ?? 'Job'} Pull Sheet`,
          job_id: job.id,
          status: 'draft',
          scheduled_out_at: job.start_at ?? null,
          expected_return_at: job.end_at ?? null,
          notes: job.notes ?? null,
          warehouse_id: job.warehouse_id ?? null,
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

  async function handleArchiveToggle(e: React.MouseEvent, jobId: string, currentlyArchived: boolean) {
    e.preventDefault();
    e.stopPropagation();
    
    setArchiving(jobId);
    try {
      await (supabase.from('jobs') as any)
        .update({ archived: !currentlyArchived })
        .eq('id', jobId);
      // Also archive/unarchive any pull sheets attached to this job
      try {
        if (!currentlyArchived) {
          // Job is being archived -> mark pull sheets as archived
          await (supabase.from('pull_sheets') as any)
            .update({ status: 'archived' })
            .eq('job_id', jobId);
        } else {
          // Job is being un-archived -> return pull sheets to draft
          await (supabase.from('pull_sheets') as any)
            .update({ status: 'draft' })
            .eq('job_id', jobId);
        }
      } catch (psErr) {
        console.error('Failed to update pull sheets for job archive toggle', psErr);
      }
      reload();
    } catch (err) {
      console.error('Error toggling archive:', err);
      alert('Failed to update job archive status');
    } finally {
      setArchiving(null);
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
        <h1 className="text-2xl font-bold">Jobs {showArchived && <span className="text-zinc-500 text-lg ml-2">(Archived)</span>}</h1>
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
          {/* Show Archived Toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-2 px-4 py-2 rounded border ${
              showArchived 
                ? 'bg-purple-600 text-white border-purple-500' 
                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            <i className={`fas ${showArchived ? 'fa-box-open' : 'fa-archive'}`}></i>
            {showArchived ? 'Show Active' : 'Show Archived'}
          </button>
          <Link
            href="/app/clients"
            className="flex items-center gap-2 bg-zinc-800 text-white px-4 py-2 rounded hover:bg-zinc-700 border border-zinc-700"
          >
            <i className="fas fa-users"></i> Clients
          </Link>
          <button
            className="flex items-center gap-2 bg-amber-500 text-black px-4 py-2 rounded hover:bg-amber-400"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <Plus size={18} /> {showCreateForm ? 'Cancel' : 'New Job'}
          </button>
        </div>
      </div>
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
          onChange={e => setStatus(e.target.value as "all" | "planned" | "confirmed" | "completed" | "canceled")}
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      
      {/* Inline Create Job Form */}
      {showCreateForm && (
        <div className="bg-zinc-800 border border-amber-500 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-amber-400 mb-4">Create New Job</h2>
          
          {!showClientInfoSection ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Job Code *
                  </label>
                  <input
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
                    placeholder="e.g., JOB-001"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Job Title *
                  </label>
                  <input
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
                    placeholder="e.g., Conference Setup"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Client Name *
                </label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
                  placeholder="Enter client name"
                  value={form.client}
                  onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  If this is a new client, you'll be prompted for contact details
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>
              
              {/* Next Steps Preview */}
              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">After creating, you can:</h3>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded text-sm">
                    <i className="fas fa-map-marker-alt"></i>
                    Add Venue
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded text-sm">
                    <i className="fas fa-users"></i>
                    Add Labor
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded text-sm">
                    <i className="fas fa-dollar-sign"></i>
                    Add Income
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="bg-amber-500 text-black px-6 py-2 rounded font-semibold hover:bg-amber-400"
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create Job & Continue"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setForm({ code: "", title: "", client: "", startDate: "", endDate: "" });
                  }}
                  className="px-6 py-2 border border-zinc-700 rounded text-zinc-300 hover:bg-zinc-700"
                  disabled={creating}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-zinc-300 mb-4">
                <strong>{form.client}</strong> is a new client. Please provide their contact information:
              </p>
              
              <form onSubmit={handleClientInfoSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
                      placeholder="(555) 123-4567"
                      value={clientForm.phone}
                      onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
                      placeholder="client@example.com"
                      value={clientForm.email}
                      onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Venue
                  </label>
                  <select
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
                    value={clientForm.venueId}
                    onChange={e => setClientForm(f => ({ ...f, venueId: e.target.value }))}
                  >
                    <option value="">Select a venue (optional)</option>
                    {venues.map(venue => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name} {venue.city && `- ${venue.city}, ${venue.state}`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 mt-1">
                    You can add venues later in the Venues section
                  </p>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-500"
                    disabled={creating}
                  >
                    {creating ? "Creating..." : "Save & Create Job"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowClientInfoSection(false);
                      setClientForm({ phone: "", email: "", venueId: "" });
                    }}
                    className="px-6 py-2 border border-zinc-700 rounded text-zinc-300 hover:bg-zinc-700"
                    disabled={creating}
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
      
      {loading ? (
        <p className="text-zinc-500">Loading jobs...</p>
      ) : !jobs || jobs.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="inline-block p-6 bg-zinc-800/50 rounded-full mb-6">
            <FileText className="w-16 h-16 text-zinc-600" />
          </div>
          <h3 className="text-2xl font-semibold text-zinc-300 mb-3">No Jobs Yet</h3>
          <p className="text-zinc-500 mb-8 max-w-md mx-auto">
            {showArchived 
              ? "No archived jobs found." 
              : "Get started by creating your first job. Jobs help you organize events, track equipment, and manage client relationships."}
          </p>
          {!showArchived && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Job
            </button>
          )}
        </div>
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
                        <span className="text-green-400 font-semibold">${(job.income ?? 0).toFixed(2)}</span>
                      </div>
                    )}
                    {job.labor_cost !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Labor Cost:</span>
                        <span className="text-red-400">${(job.labor_cost ?? 0).toFixed(2)}</span>
                      </div>
                    )}
                    {job.profit !== undefined && (
                      <div className="flex justify-between border-t border-zinc-700 pt-1 mt-1">
                        <span className="text-zinc-300 font-semibold">Profit:</span>
                        <span className={`font-bold ${(job.profit ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${(job.profit ?? 0).toFixed(2)}
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
                  href={`/app/warehouse/jobs/${job.id}/return-manifest`}
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
                <button
                  onClick={(e) => handleArchiveToggle(e, job.id, (job as any).archived)}
                  disabled={archiving === job.id}
                  className={`flex items-center gap-1 transition-colors disabled:opacity-50 ${
                    (job as any).archived 
                      ? 'hover:text-green-400' 
                      : 'hover:text-purple-400'
                  }`}
                >
                  <i className={`fas ${(job as any).archived ? 'fa-box-open' : 'fa-archive'}`} style={{ fontSize: '14px' }}></i>
                  <span>{archiving === job.id ? 'Updating...' : (job as any).archived ? 'Unarchive' : 'Archive'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
