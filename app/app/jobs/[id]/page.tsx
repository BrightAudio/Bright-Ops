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
  title: string | null;
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
  const [showAssignCrewModal, setShowAssignCrewModal] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [rateType, setRateType] = useState<'hourly' | 'daily'>('hourly');
  const [rateAmount, setRateAmount] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [assigningCrew, setAssigningCrew] = useState(false);
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', code: '', status: '', start_at: '', end_at: '', venue: '', notes: '' });
  const [savingJob, setSavingJob] = useState(false);

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
        setJob(data as any);
        setIncomeValue((data as any).income?.toString() || '0');
        setEditForm({
          title: data.title || '',
          code: data.code || '',
          status: data.status || 'draft',
          start_at: data.start_at ? data.start_at.slice(0, 16) : '',
          end_at: data.end_at ? data.end_at.slice(0, 16) : '',
          venue: data.venue || '',
          notes: data.notes || ''
        });
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

  useEffect(() => {
    async function loadEmployees() {
      const { data } = await supabase
        .from('employees')
        .select('id, name, email')
        .order('name');
      setEmployees(data || []);
    }
    loadEmployees();
  }, []);

  useEffect(() => {
    async function loadAssignments() {
      if (!job?.id) return;
      const { data } = await supabase
        .from('job_assignments')
        .select(`
          id,
          role,
          status,
          rate_type,
          rate_amount,
          estimated_hours,
          employees:employee_id (id, name)
        `)
        .eq('job_id', job.id);
      setAssignments(data || []);
    }
    if (job?.id) {
      loadAssignments();
    }
  }, [job?.id]);

  async function handleAssignCrew() {
    if (!selectedEmployee || !selectedRole || !job?.id) return;
    
    setAssigningCrew(true);
    try {
      const { error } = await supabase
        .from('job_assignments')
        .insert({
          job_id: job.id,
          employee_id: selectedEmployee,
          role: selectedRole,
          status: 'assigned',
          rate_type: rateType,
          rate_amount: rateAmount ? parseFloat(rateAmount) : null,
          estimated_hours: rateType === 'hourly' && estimatedHours ? parseFloat(estimatedHours) : null
        });
      
      if (error) throw error;

      // Get employee name for notification
      const assignedEmployee = employees.find(e => e.id === selectedEmployee);
      
      // Create notification for the assigned employee
      if (assignedEmployee) {
        const jobDate = job.start_at ? new Date(job.start_at).toLocaleDateString() : 'TBD';
        await supabase
          .from('notifications')
          .insert({
            user_id: selectedEmployee,
            type: 'job_assignment',
            title: 'New Job Assignment',
            message: `You've been assigned to "${job.title || job.code}" as ${selectedRole}${job.start_at ? ` on ${jobDate}` : ''}`,
            link: `/app/jobs/${job.id}`
          });
      }
      
      // Reload assignments
      const { data } = await supabase
        .from('job_assignments')
        .select(`
          id,
          role,
          status,
          rate_type,
          rate_amount,
          estimated_hours,
          employees:employee_id (id, name)
        `)
        .eq('job_id', job.id);
      setAssignments(data || []);
      
      // Reset and close
      setSelectedEmployee('');
      setSelectedRole('');
      setRateType('hourly');
      setRateAmount('');
      setEstimatedHours('');
      setShowAssignCrewModal(false);
    } catch (err) {
      console.error('Error assigning crew:', err);
      alert('Failed to assign crew member');
    } finally {
      setAssigningCrew(false);
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!confirm('Remove this crew assignment?')) return;
    
    try {
      const { error } = await supabase
        .from('job_assignments')
        .delete()
        .eq('id', assignmentId);
      
      if (error) throw error;
      
      setAssignments(assignments.filter(a => a.id !== assignmentId));
    } catch (err) {
      console.error('Error removing assignment:', err);
      alert('Failed to remove assignment');
    }
  }

  async function handleSaveJob() {
    if (!job) return;
    setSavingJob(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          title: editForm.title || null,
          code: editForm.code || job.code,
          status: editForm.status,
          start_at: editForm.start_at || null,
          end_at: editForm.end_at || null,
          venue: editForm.venue || null,
          notes: editForm.notes || null
        })
        .eq('id', job.id);

      if (error) throw error;

      // Reload job
      const { data } = await supabase
        .from('jobs')
        .select(`
          *,
          clients (
            name,
            email,
            phone
          )
        `)
        .eq('id', job.id)
        .single();

      if (data) {
        setJob(data as any);
      }
      setShowEditJobModal(false);
    } catch (err) {
      console.error('Error saving job:', err);
      alert('Failed to save job');
    } finally {
      setSavingJob(false);
    }
  }

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
          <button 
            onClick={() => setShowEditJobModal(true)}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
          >
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
            <div className="space-y-6">
              {/* Labor Cost Summary */}
              {assignments.length > 0 && (
                <div className="p-4 rounded-lg bg-zinc-800 border border-zinc-700">
                  <h3 className="text-md font-semibold text-amber-300 mb-3 flex items-center gap-2">
                    <i className="fas fa-calculator"></i>
                    Labor Cost Estimate
                  </h3>
                  <div className="text-sm text-zinc-400 mb-2">
                    Note: This is an estimate. Actual costs may vary based on hours worked or days scheduled.
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900 rounded p-3">
                      <div className="text-xs text-zinc-500">Hourly Crew (Estimated)</div>
                      <div className="text-xl font-bold text-white">
                        ${assignments
                          .filter(a => a.rate_type === 'hourly' && a.rate_amount)
                          .reduce((sum, a) => sum + ((a.rate_amount || 0) * (a.estimated_hours || 0)), 0)
                          .toFixed(2)}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        {assignments.filter(a => a.rate_type === 'hourly' && a.rate_amount).reduce((sum, a) => sum + (a.estimated_hours || 0), 0).toFixed(1)} total hours
                      </div>
                    </div>
                    <div className="bg-zinc-900 rounded p-3">
                      <div className="text-xs text-zinc-500">Day Rate Crew</div>
                      <div className="text-xl font-bold text-white">
                        ${assignments
                          .filter(a => a.rate_type === 'daily' && a.rate_amount)
                          .reduce((sum, a) => sum + (a.rate_amount || 0), 0)
                          .toFixed(2)}/day
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="p-6 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-amber-300 flex items-center gap-2">
                    <i className="fas fa-users"></i>
                    Crew Management
                  </h2>
                  <button 
                    onClick={() => setShowAssignCrewModal(!showAssignCrewModal)}
                    className="px-4 py-2 bg-amber-400 text-black rounded hover:bg-amber-500 font-semibold"
                  >
                    <i className={`fas ${showAssignCrewModal ? 'fa-minus' : 'fa-plus'} mr-2`}></i>
                    {showAssignCrewModal ? 'Cancel' : 'Assign Crew Member'}
                  </button>
                </div>
                
                {assignments.length === 0 && !showAssignCrewModal ? (
                  <p className="text-zinc-400">No crew members assigned yet.</p>
                ) : (
                  <div className="space-y-2">
                    {assignments.map(assignment => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded">
                        <div>
                          <div className="text-white font-medium">{assignment.employees?.name}</div>
                          <div className="text-sm text-zinc-400">{assignment.role}</div>
                          {assignment.rate_amount && (
                            <div className="text-sm text-green-400">
                              ${assignment.rate_amount}/{assignment.rate_type === 'hourly' ? 'hr' : 'day'}
                              {assignment.rate_type === 'hourly' && assignment.estimated_hours && (
                                <span className="ml-2 text-zinc-400">
                                  × {assignment.estimated_hours}h = <span className="text-green-300 font-semibold">${(assignment.rate_amount * assignment.estimated_hours).toFixed(2)}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            assignment.status === 'approved' ? 'bg-green-900 text-green-200' :
                            assignment.status === 'pending' ? 'bg-yellow-900 text-yellow-200' :
                            'bg-blue-900 text-blue-200'
                          }`}>
                            {assignment.status}
                          </span>
                          <button
                            onClick={() => handleRemoveAssignment(assignment.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Inline Assign Crew Form */}
              {showAssignCrewModal && (
                <div className="p-6 rounded-lg bg-zinc-800 border border-amber-500">
                  <h3 className="text-lg font-semibold text-amber-400 mb-4">Assign Crew Member</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                          Employee *
                        </label>
                        <select
                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
                          value={selectedEmployee}
                          onChange={e => setSelectedEmployee(e.target.value)}
                          required
                        >
                          <option value="">Select employee</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                          Role *
                        </label>
                        <input
                          type="text"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
                          placeholder="e.g., Audio Engineer, Lighting Tech"
                          value={selectedRole}
                          onChange={e => setSelectedRole(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                          Rate Type
                        </label>
                        <select
                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
                          value={rateType}
                          onChange={e => setRateType(e.target.value as 'hourly' | 'daily')}
                        >
                          <option value="hourly">Hourly Rate</option>
                          <option value="daily">Day Rate</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                          Rate Amount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
                          placeholder={rateType === 'hourly' ? '25.00' : '200.00'}
                          value={rateAmount}
                          onChange={e => setRateAmount(e.target.value)}
                        />
                      </div>

                      {rateType === 'hourly' && (
                        <div>
                          <label className="block text-sm font-medium text-zinc-300 mb-1">
                            Estimated Hours
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
                            placeholder="8.0"
                            value={estimatedHours}
                            onChange={e => setEstimatedHours(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleAssignCrew}
                        disabled={assigningCrew || !selectedEmployee || !selectedRole}
                        className="bg-amber-500 text-black px-6 py-2 rounded font-semibold hover:bg-amber-400 disabled:opacity-50"
                      >
                        {assigningCrew ? 'Assigning...' : 'Assign'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAssignCrewModal(false);
                          setSelectedEmployee('');
                          setSelectedRole('');
                          setRateType('hourly');
                          setRateAmount('');
                          setEstimatedHours('');
                        }}
                        disabled={assigningCrew}
                        className="px-6 py-2 border border-zinc-700 rounded text-zinc-300 hover:bg-zinc-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
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

    {/* Edit Job Modal */}
    {showEditJobModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              <i className="fas fa-edit mr-2 text-amber-400"></i>
              Edit Job
            </h2>
            <button
              onClick={() => setShowEditJobModal(false)}
              className="text-zinc-400 hover:text-white"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          <div className="space-y-4">
            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Job Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={editForm.code}
                onChange={e => setEditForm({ ...editForm, code: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-amber-400"
                placeholder="e.g., JOB-2025-001"
                required
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={editForm.title}
                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-amber-400"
                placeholder="e.g., Corporate Event Setup"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Status
              </label>
              <select
                value={editForm.status}
                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-amber-400"
              >
                <option value="draft">Draft</option>
                <option value="planned">Planned</option>
                <option value="confirmed">Confirmed</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Venue */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Venue
              </label>
              <input
                type="text"
                value={editForm.venue}
                onChange={e => setEditForm({ ...editForm, venue: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-amber-400"
                placeholder="e.g., Convention Center"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={editForm.start_at}
                onChange={e => setEditForm({ ...editForm, start_at: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={editForm.end_at}
                onChange={e => setEditForm({ ...editForm, end_at: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Notes
              </label>
              <textarea
                value={editForm.notes}
                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-amber-400"
                rows={4}
                placeholder="Additional notes or instructions..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSaveJob}
              disabled={savingJob || !editForm.code}
              className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-semibold rounded transition-colors"
            >
              {savingJob ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Save Changes
                </>
              )}
            </button>
            <button
              onClick={() => setShowEditJobModal(false)}
              disabled={savingJob}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 text-white rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    </DashboardLayout>
  );
}