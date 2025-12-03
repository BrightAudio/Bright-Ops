"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabaseBrowser } from "@/lib/supabaseClient";

type Employee = {
  id: string;
  name: string;
  email: string | null;
  role: 'manager' | 'crew' | null;
};

type Job = {
  id: string;
  code: string | null;
  title: string | null;
  start_at: string | null;
  end_at: string | null;
  venue: string | null;
  status: string | null;
};

type JobAssignment = {
  id: string;
  job_id: string;
  employee_id: string;
  role: string;
  rate_type: 'hourly' | 'daily' | null;
  rate_amount: number | null;
  status: string;
  employees?: { name: string };
};

type JobRequest = {
  id: string;
  job_id: string;
  employee_id: string;
  requested_role: string;
  status: 'pending' | 'approved' | 'denied';
  requested_at: string;
  notes: string | null;
  employees?: { name: string };
  jobs?: Job;
};

type Availability = {
  id?: string;
  employee_id: string;
  available_date: string;
  is_available: boolean;
  notes: string | null;
};

export default function ScheduledCrewPage() {
  const supabase = supabaseBrowser();
  
  // User state
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [isManager, setIsManager] = useState(false);
  
  // Data state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'jobs' | 'calendar' | 'assigned'>('jobs');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availabilityNotes, setAvailabilityNotes] = useState('');
  
  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    try {
      // For demo purposes, allow selecting an employee
      // In production, this would come from auth
      const { data: employeesData } = await supabase
        .from('employees')
        .select('*')
        .order('name');
      
      setEmployees(employeesData || []);
      
      // Load jobs
      await loadJobs();
      
      // Load assignments
      await loadAssignments();
      
      // Load requests
      await loadRequests();
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadJobs() {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .in('status', ['planned', 'confirmed'])
      .order('start_at', { ascending: true });
    
    setJobs(data || []);
  }

  async function loadAssignments() {
    const { data } = await supabase
      .from('job_assignments')
      .select(`
        *,
        employees:employee_id (name)
      `)
      .eq('status', 'assigned');
    
    setAssignments(data || []);
  }

  async function loadRequests() {
    try {
      const { data, error } = await supabase
        .from('job_requests')
        .select(`
          *,
          employees:employee_id (name),
          jobs:job_id (*)
        `)
        .order('requested_at', { ascending: false });
      
      if (error) {
        console.error('Error loading requests:', error);
        return;
      }
      
      setRequests(data || []);
    } catch (err) {
      console.error('Exception loading requests:', err);
    }
  }

  async function loadAvailability(employeeId: string) {
    try {
      // Use RPC function to bypass schema cache
      const { data, error } = await supabase
        .rpc('get_employee_availability', { p_employee_id: employeeId });
      
      if (error) {
        console.error('Error loading availability:', error);
        return;
      }
      
      setAvailability(data || []);
    } catch (err) {
      console.error('Exception loading availability:', err);
    }
  }

  function handleEmployeeSelect(employeeId: string) {
    setSelectedEmployee(employeeId);
    const employee = employees.find(e => e.id === employeeId);
    setCurrentEmployee(employee || null);
    setIsManager(employee?.role === 'manager');
    
    if (employeeId) {
      loadAvailability(employeeId);
    }
  }

  async function handleRequestJob(jobId: string, requestedRole: string) {
    if (!currentEmployee) {
      alert('Please select an employee first');
      return;
    }

    try {
      const { error } = await supabase
        .from('job_requests')
        .insert({
          job_id: jobId,
          employee_id: currentEmployee.id,
          requested_role: requestedRole,
          status: 'pending'
        });

      if (error) throw error;

      alert('Request submitted!');
      await loadRequests();
    } catch (err: any) {
      console.error('Error requesting job:', err);
      alert(`Error: ${err.message}`);
    }
  }

  async function handleApproveRequest(requestId: string, request: JobRequest) {
    if (!isManager) {
      alert('Only managers can approve requests');
      return;
    }

    try {
      // Create assignment
      const { error: assignError } = await supabase
        .from('job_assignments')
        .insert({
          job_id: request.job_id,
          employee_id: request.employee_id,
          role: request.requested_role,
          status: 'assigned'
        });

      if (assignError) throw assignError;

      // Update request status
      const { error: updateError } = await supabase
        .from('job_requests')
        .update({ 
          status: 'approved',
          reviewed_by: currentEmployee?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      alert('Request approved and crew assigned!');
      await loadRequests();
      await loadAssignments();
    } catch (err: any) {
      console.error('Error approving request:', err);
      alert(`Error: ${err.message}`);
    }
  }

  async function handleDenyRequest(requestId: string) {
    if (!isManager) {
      alert('Only managers can deny requests');
      return;
    }

    try {
      const { error } = await supabase
        .from('job_requests')
        .update({ 
          status: 'denied',
          reviewed_by: currentEmployee?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      alert('Request denied');
      await loadRequests();
    } catch (err: any) {
      console.error('Error denying request:', err);
      alert(`Error: ${err.message}`);
    }
  }

  function handleDateClick(date: string) {
    if (!currentEmployee) {
      alert('Please select an employee first');
      return;
    }
    
    // Toggle: if clicking same date, close menu
    if (selectedDate === date) {
      setSelectedDate(null);
      setAvailabilityNotes('');
    } else {
      setSelectedDate(date);
      const existing = availability.find(a => a.available_date === date);
      setAvailabilityNotes(existing?.notes || '');
    }
  }

  async function handleSaveAvailability(isAvailable: boolean) {
    if (!currentEmployee || !selectedDate) return;

    try {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .rpc('set_employee_availability', {
          p_employee_id: currentEmployee.id,
          p_date: selectedDate,
          p_available: isAvailable
        });
      
      if (error) throw error;

      // Update notes if provided
      if (availabilityNotes) {
        const existing = availability.find(a => a.available_date === selectedDate);
        if (existing?.id) {
          await supabase
            .from('employee_availability')
            .update({ notes: availabilityNotes })
            .eq('id', existing.id);
        }
      }

      // Update UI
      const existing = availability.find(a => a.available_date === selectedDate);
      if (existing) {
        setAvailability(prev => prev.map(a => 
          a.available_date === selectedDate 
            ? { ...a, is_available: isAvailable, notes: availabilityNotes || null } 
            : a
        ));
      } else {
        setAvailability(prev => [...prev, {
          employee_id: currentEmployee.id,
          available_date: selectedDate,
          is_available: isAvailable,
          notes: availabilityNotes || null
        }]);
      }

      setSelectedDate(null);
      setAvailabilityNotes('');
    } catch (err: any) {
      console.error('Error updating availability:', err);
      alert(`Error: ${err.message || err.code || 'Unknown error'}`);
    }
  }

  async function handleToggleAvailability(date: string, isAvailable: boolean) {
    if (!currentEmployee) return;

    try {
      // Use RPC function to bypass schema cache
      const { data, error } = await supabase
        .rpc('set_employee_availability', {
          p_employee_id: currentEmployee.id,
          p_date: date,
          p_available: isAvailable
        });
      
      if (error) throw error;

      // Optimistically update the UI
      const existing = availability.find(a => a.available_date === date);
      
      if (existing) {
        setAvailability(prev => prev.map(a => 
          a.available_date === date ? { ...a, is_available: isAvailable } : a
        ));
      } else {
        setAvailability(prev => [...prev, {
          employee_id: currentEmployee.id,
          available_date: date,
          is_available: isAvailable,
          notes: null
        }]);
      }
    } catch (err: any) {
      console.error('Error updating availability:', err);
      alert(`Error: ${err.message || err.code || 'Unknown error - check console'}`);
    }
  }

  function getJobsForEmployee(employeeId: string) {
    return assignments
      .filter(a => a.employee_id === employeeId)
      .map(a => ({
        assignment: a,
        job: jobs.find(j => j.id === a.job_id)
      }))
      .filter(item => item.job);
  }

  function getPendingRequestsForEmployee(employeeId: string) {
    return requests.filter(r => 
      r.employee_id === employeeId && 
      r.status === 'pending'
    );
  }

  function getAllPendingRequests() {
    return requests.filter(r => r.status === 'pending');
  }

  function getNextNDays(n: number): string[] {
    const dates: string[] = [];
    const today = new Date();
    
    for (let i = 0; i < n; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  }

  function isDateAvailable(date: string): boolean {
    const avail = availability.find(a => a.available_date === date);
    return avail?.is_available ?? true;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="min-h-screen bg-zinc-900 px-6 py-10 text-white">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">Scheduled Crew & Availability</h1>
          
          {/* Employee Selector (simulating login) */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mb-6">
            <label className="block text-sm font-medium mb-2 text-zinc-400">
              Acting as (simulates logged-in user):
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => handleEmployeeSelect(e.target.value)}
              className="w-full max-w-md px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white"
            >
              <option value="">Select Employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.role === 'manager' ? '(Manager)' : '(Crew)'}
                </option>
              ))}
            </select>
          </div>

          {currentEmployee && (
            <div className="bg-zinc-800 border border-amber-500 rounded-lg p-4 mb-6">
              <p className="text-amber-500 font-semibold">
                Logged in as: {currentEmployee.name} ({isManager ? 'Manager' : 'Crew'})
              </p>
            </div>
          )}

          {/* View Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setSelectedView('jobs')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedView === 'jobs'
                  ? 'bg-amber-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Available Jobs
            </button>
            <button
              onClick={() => setSelectedView('calendar')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedView === 'calendar'
                  ? 'bg-amber-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
              disabled={!currentEmployee}
            >
              My Availability
            </button>
            <button
              onClick={() => setSelectedView('assigned')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedView === 'assigned'
                  ? 'bg-amber-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
              disabled={!currentEmployee}
            >
              My Assigned Jobs
            </button>
          </div>
        </div>

        {/* Available Jobs View */}
        {selectedView === 'jobs' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Available Jobs</h2>
            
            {/* Pending Requests (Managers Only) */}
            {isManager && getAllPendingRequests().length > 0 && (
              <div className="bg-amber-900/20 border border-amber-500 rounded-lg p-4 mb-6">
                <h3 className="text-xl font-semibold mb-3 text-amber-500">
                  Pending Requests ({getAllPendingRequests().length})
                </h3>
                <div className="space-y-2">
                  {getAllPendingRequests().map(request => (
                    <div key={request.id} className="bg-zinc-800 border border-zinc-700 rounded p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{request.employees?.name}</p>
                        <p className="text-sm text-zinc-400">
                          {request.jobs?.title} - {request.requested_role}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Requested: {new Date(request.requested_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveRequest(request.id, request)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDenyRequest(request.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Job List */}
            {jobs.length === 0 ? (
              <p className="text-zinc-400">No upcoming jobs</p>
            ) : (
              jobs.map(job => {
                const jobAssignments = assignments.filter(a => a.job_id === job.id);
                const userHasRequested = currentEmployee && requests.some(
                  r => r.job_id === job.id && 
                       r.employee_id === currentEmployee.id && 
                       r.status === 'pending'
                );
                const userIsAssigned = currentEmployee && jobAssignments.some(
                  a => a.employee_id === currentEmployee.id
                );

                return (
                  <div key={job.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-semibold">
                          {job.code && `${job.code} - `}{job.title}
                        </h3>
                        <p className="text-sm text-zinc-400">
                          {job.start_at && new Date(job.start_at).toLocaleDateString()}
                          {job.venue && ` • ${job.venue}`}
                        </p>
                      </div>
                      {userIsAssigned && (
                        <span className="px-3 py-1 bg-green-600 text-white text-sm rounded">
                          Assigned
                        </span>
                      )}
                      {userHasRequested && (
                        <span className="px-3 py-1 bg-amber-600 text-white text-sm rounded">
                          Requested
                        </span>
                      )}
                    </div>

                    {/* Current Crew */}
                    {jobAssignments.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-zinc-400 mb-1">Current Crew:</p>
                        <div className="flex flex-wrap gap-2">
                          {jobAssignments.map(a => (
                            <span key={a.id} className="px-2 py-1 bg-zinc-700 text-sm rounded">
                              {a.employees?.name} - {a.role}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Request Button (Crew Only) */}
                    {!isManager && currentEmployee && !userIsAssigned && !userHasRequested && (
                      <RequestJobButton
                        onRequest={(role) => handleRequestJob(job.id, role)}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Availability Calendar View */}
        {selectedView === 'calendar' && currentEmployee && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">My Availability Calendar</h2>
                <p className="text-zinc-400 mt-1">
                  Click on any date to set your availability. Green = Available, Red = Unavailable
                </p>
              </div>
              <button
                onClick={() => setSelectedView('jobs')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors"
              >
                Save & Exit
              </button>
            </div>
            
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-zinc-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                const startingDayOfWeek = firstDay.getDay();
                const daysInMonth = lastDay.getDate();
                
                const calendarDays = [];
                
                // Empty cells before month starts
                for (let i = 0; i < startingDayOfWeek; i++) {
                  calendarDays.push(<div key={`empty-${i}`} className="min-h-[80px]"></div>);
                }
                
                // Days of the month
                for (let day = 1; day <= daysInMonth; day++) {
                  const date = new Date(today.getFullYear(), today.getMonth(), day);
                  const dateStr = date.toISOString().split('T')[0];
                  const availRecord = availability.find(a => a.available_date === dateStr);
                  const isAvail = availRecord?.is_available ?? true;
                  const hasNotes = !!availRecord?.notes;
                  const isToday = day === today.getDate();
                  
                  const isSelected = selectedDate === dateStr;
                  
                  calendarDays.push(
                    <div key={dateStr} className="relative">
                      <button
                        type="button"
                        className={`w-full min-h-[80px] p-2 rounded border transition-all relative cursor-pointer ${
                          isToday
                            ? 'border-amber-500 border-2'
                            : isSelected
                            ? 'border-blue-500 border-2'
                            : 'border-zinc-700'
                        } ${
                          isAvail
                            ? 'bg-green-900/30 hover:bg-green-900/50'
                            : 'bg-red-900/30 hover:bg-red-900/50'
                        }`}
                        onClick={() => handleDateClick(dateStr)}
                      >
                        {hasNotes && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full"></div>
                        )}
                        <div className={`text-sm font-semibold mb-1 ${
                          isToday ? 'text-amber-500' : 'text-white'
                        }`}>
                          {day}
                        </div>
                        {availRecord && (
                          <div className="text-[10px] text-zinc-300">
                            {isAvail ? '✓ Available' : '✗ Unavailable'}
                          </div>
                        )}
                        {hasNotes && (
                          <div className="text-[9px] text-amber-400 mt-1 truncate">
                            {availRecord.notes}
                          </div>
                        )}
                      </button>
                      
                      {/* Inline availability menu */}
                      {isSelected && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50 p-3">
                          <div className="text-xs font-semibold text-white mb-2">
                            {new Date(dateStr).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                          <div className="flex gap-2 mb-2">
                            <button
                              onClick={() => handleSaveAvailability(true)}
                              className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                            >
                              ✓ Available
                            </button>
                            <button
                              onClick={() => handleSaveAvailability(false)}
                              className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                            >
                              ✗ Unavailable
                            </button>
                          </div>
                          <textarea
                            placeholder="Add notes (optional)"
                            value={availabilityNotes}
                            onChange={(e) => setAvailabilityNotes(e.target.value)}
                            className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-white placeholder-zinc-500 resize-none"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  );
                }
                
                return calendarDays;
              })()}
            </div>
          </div>
        )}

        {/* Assigned Jobs View */}
        {selectedView === 'assigned' && currentEmployee && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">My Assigned Jobs</h2>
            
            {getJobsForEmployee(currentEmployee.id).length === 0 ? (
              <p className="text-zinc-400">No assigned jobs</p>
            ) : (
              getJobsForEmployee(currentEmployee.id).map(({ assignment, job }) => (
                <div key={assignment.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <h3 className="text-xl font-semibold mb-2">
                    {job?.code && `${job.code} - `}{job?.title}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-zinc-400">Date</p>
                      <p>{job?.start_at && new Date(job.start_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Venue</p>
                      <p>{job?.venue || 'TBD'}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Your Role</p>
                      <p>{assignment.role}</p>
                    </div>
                    {assignment.rate_type && assignment.rate_amount && (
                      <div>
                        <p className="text-zinc-400">Rate</p>
                        <p>
                          ${assignment.rate_amount.toFixed(2)}/{assignment.rate_type === 'hourly' ? 'hr' : 'day'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Pending Requests */}
            {getPendingRequestsForEmployee(currentEmployee.id).length > 0 && (
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-3 text-amber-500">My Pending Requests</h3>
                <div className="space-y-2">
                  {getPendingRequestsForEmployee(currentEmployee.id).map(request => (
                    <div key={request.id} className="bg-zinc-800 border border-amber-500 rounded p-3">
                      <p className="font-medium">{request.jobs?.title}</p>
                      <p className="text-sm text-zinc-400">Role: {request.requested_role}</p>
                      <p className="text-xs text-zinc-500">
                        Requested: {new Date(request.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}

function RequestJobButton({ onRequest }: { onRequest: (role: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [role, setRole] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    onRequest(role);
    setRole('');
    setShowForm(false);
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors"
      >
        Request to Work This Job
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <div className="flex-1">
        <label className="block text-sm text-zinc-400 mb-1">Your Role</label>
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g., Audio Engineer, Lighting Tech"
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white"
          required
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded"
      >
        Submit Request
      </button>
      <button
        type="button"
        onClick={() => setShowForm(false)}
        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded"
      >
        Cancel
      </button>
    </form>
  );
}
