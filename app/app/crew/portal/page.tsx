"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { Calendar, Clock, MapPin, Users, CheckCircle, XCircle, AlertCircle } from "lucide-react";

type Job = {
  id: string;
  code: string | null;
  title: string | null;
  start_at: string | null;
  end_at: string | null;
  venue: string | null;
  client: string | null;
  status: string | null;
};

type JobAssignment = {
  id: string;
  job_id: string;
  role: string;
  status: string;
  rate_type: string | null;
  rate_amount: number | null;
  approved_at: string | null;
  jobs: Job;
};

type Availability = {
  id: string;
  available_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  created_at: string;
};

export default function CrewPortal() {
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'my-jobs' | 'open-jobs' | 'availability'>('my-jobs');
  const [myJobs, setMyJobs] = useState<JobAssignment[]>([]);
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Availability form
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
  const [availForm, setAvailForm] = useState({
    available_date: '',
    start_time: '09:00',
    end_time: '17:00',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Get current user's employee record
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No user logged in");
        setLoading(false);
        return;
      }

      const { data: empData } = await supabase
        .from("employees")
        .select("*")
        .eq("email", user.email)
        .single();

      if (!empData) {
        console.error("Employee record not found");
        setLoading(false);
        return;
      }

      setCurrentEmployee(empData);

      // Load my assigned and pending jobs
      const { data: assignmentsData } = await supabase
        .from("job_assignments")
        .select(`
          id,
          job_id,
          role,
          status,
          rate_type,
          rate_amount,
          approved_at,
          jobs (id, code, title, start_at, end_at, venue, client, status)
        `)
        .eq("employee_id", empData.id)
        .in("status", ["assigned", "pending", "approved"]);

      setMyJobs((assignmentsData || []) as any);

      // Load open jobs (jobs where I'm not already assigned or pending)
      const { data: allJobsData } = await supabase
        .from("jobs")
        .select("*")
        .eq("archived", false)
        .in("status", ["draft", "active"]);

      const assignedJobIds = new Set((assignmentsData || []).map((a: any) => a.job_id));
      const openJobsList = (allJobsData || []).filter((job: any) => !assignedJobIds.has(job.id));
      setOpenJobs(openJobsList);

      // Load my availability
      const { data: availData } = await supabase
        .from("employee_availability")
        .select("*")
        .eq("employee_id", empData.id)
        .order("available_date", { ascending: true });

      setAvailability(availData || []);

    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function volunteerForJob(jobId: string, role: string) {
    if (!currentEmployee) return;

    try {
      const { error } = await supabase
        .from("job_assignments")
        .insert({
          job_id: jobId,
          employee_id: currentEmployee.id,
          role: role,
          status: 'pending',
          requested_at: new Date().toISOString()
        });

      if (error) throw error;

      alert("Volunteer request submitted! Awaiting manager approval.");
      loadData();
    } catch (err) {
      console.error("Error volunteering:", err);
      alert("Failed to submit volunteer request");
    }
  }

  async function submitAvailability() {
    if (!currentEmployee || !availForm.available_date) return;

    try {
      const { error } = await supabase
        .from("employee_availability")
        .insert({
          employee_id: currentEmployee.id,
          available_date: availForm.available_date,
          start_time: availForm.start_time,
          end_time: availForm.end_time,
          notes: availForm.notes
        });

      if (error) throw error;

      setAvailForm({
        available_date: '',
        start_time: '09:00',
        end_time: '17:00',
        notes: ''
      });
      setShowAvailabilityForm(false);
      loadData();
    } catch (err) {
      console.error("Error submitting availability:", err);
      alert("Failed to submit availability");
    }
  }

  async function deleteAvailability(id: string) {
    try {
      const { error } = await supabase
        .from("employee_availability")
        .delete()
        .eq("id", id);

      if (error) throw error;
      loadData();
    } catch (err) {
      console.error("Error deleting availability:", err);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  }

  function formatDateTime(dateStr: string | null) {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString();
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'assigned':
      case 'approved':
        return <span className="px-2 py-1 bg-green-900/30 text-green-300 border border-green-700 rounded text-xs">Confirmed</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-900/30 text-yellow-300 border border-yellow-700 rounded text-xs flex items-center gap-1"><AlertCircle size={12}/>Pending</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-900/30 text-red-300 border border-red-700 rounded text-xs">Rejected</span>;
      default:
        return null;
    }
  }

  if (!currentEmployee) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-zinc-900 p-6 text-white">
          <div className="text-center py-12">
            <p className="text-zinc-400">Employee record not found. Please contact your manager.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-zinc-900 p-6 text-white">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Crew Portal</h1>
          <p className="text-zinc-400">Welcome, {currentEmployee.name}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-zinc-700">
          <button
            onClick={() => setActiveTab('my-jobs')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'my-jobs' 
                ? 'text-amber-400 border-b-2 border-amber-400' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            My Jobs ({myJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('open-jobs')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'open-jobs' 
                ? 'text-amber-400 border-b-2 border-amber-400' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Open Jobs ({openJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'availability' 
                ? 'text-amber-400 border-b-2 border-amber-400' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            My Availability ({availability.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading...</div>
        ) : (
          <>
            {/* My Jobs Tab */}
            {activeTab === 'my-jobs' && (
              <div className="space-y-4">
                {myJobs.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400 bg-zinc-800 rounded-lg border border-zinc-700">
                    <Users size={48} className="mx-auto mb-4 text-zinc-600" />
                    <p>No jobs assigned yet</p>
                    <p className="text-sm mt-2">Check the Open Jobs tab to volunteer for available positions</p>
                  </div>
                ) : (
                  myJobs.map(assignment => (
                    <div key={assignment.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-amber-400">
                            {assignment.jobs.code} - {assignment.jobs.title}
                          </h3>
                          <p className="text-zinc-400 text-sm">{assignment.jobs.client}</p>
                        </div>
                        {getStatusBadge(assignment.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-zinc-300">
                          <Users size={16} />
                          <span>Role: <span className="text-white font-semibold">{assignment.role}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-300">
                          <Calendar size={16} />
                          <span>{formatDate(assignment.jobs.start_at)}</span>
                        </div>
                        {assignment.jobs.venue && (
                          <div className="flex items-center gap-2 text-zinc-300">
                            <MapPin size={16} />
                            <span>{assignment.jobs.venue}</span>
                          </div>
                        )}
                        {assignment.rate_amount && (
                          <div className="flex items-center gap-2 text-zinc-300">
                            <span>Pay: <span className="text-green-400 font-semibold">${assignment.rate_amount}/{assignment.rate_type}</span></span>
                          </div>
                        )}
                      </div>
                      {assignment.status === 'pending' && (
                        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded text-yellow-300 text-sm">
                          <AlertCircle size={16} className="inline mr-2" />
                          Volunteer request pending manager approval
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Open Jobs Tab */}
            {activeTab === 'open-jobs' && (
              <div className="space-y-4">
                {openJobs.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400 bg-zinc-800 rounded-lg border border-zinc-700">
                    <Calendar size={48} className="mx-auto mb-4 text-zinc-600" />
                    <p>No open jobs available at this time</p>
                  </div>
                ) : (
                  openJobs.map(job => (
                    <div key={job.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white">
                            {job.code} - {job.title}
                          </h3>
                          <p className="text-zinc-400 text-sm">{job.client}</p>
                        </div>
                        <span className="px-3 py-1 bg-blue-900/30 text-blue-300 border border-blue-700 rounded text-xs">
                          Open
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2 text-zinc-300">
                          <Calendar size={16} />
                          <span>{formatDate(job.start_at)}</span>
                        </div>
                        {job.venue && (
                          <div className="flex items-center gap-2 text-zinc-300">
                            <MapPin size={16} />
                            <span>{job.venue}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {ROLES.map(role => (
                          <button
                            key={role}
                            onClick={() => volunteerForJob(job.id, role)}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold transition-colors text-sm"
                          >
                            Volunteer as {role}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Availability Tab */}
            {activeTab === 'availability' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-zinc-400">Post when you're available to work</p>
                  <button
                    onClick={() => setShowAvailabilityForm(!showAvailabilityForm)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold transition-colors"
                  >
                    {showAvailabilityForm ? 'Cancel' : '+ Post Availability'}
                  </button>
                </div>

                {showAvailabilityForm && (
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Post New Availability</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Date</label>
                        <input
                          type="date"
                          value={availForm.available_date}
                          onChange={e => setAvailForm({...availForm, available_date: e.target.value})}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-2">Time Range</label>
                        <div className="flex gap-2">
                          <input
                            type="time"
                            value={availForm.start_time}
                            onChange={e => setAvailForm({...availForm, start_time: e.target.value})}
                            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white"
                          />
                          <span className="text-zinc-400 flex items-center">to</span>
                          <input
                            type="time"
                            value={availForm.end_time}
                            onChange={e => setAvailForm({...availForm, end_time: e.target.value})}
                            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm text-zinc-400 mb-2">Notes (optional)</label>
                      <textarea
                        value={availForm.notes}
                        onChange={e => setAvailForm({...availForm, notes: e.target.value})}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white"
                        rows={3}
                        placeholder="Any preferences or details..."
                      />
                    </div>
                    <button
                      onClick={submitAvailability}
                      disabled={!availForm.available_date}
                      className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded font-semibold transition-colors"
                    >
                      Submit Availability
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  {availability.length === 0 ? (
                    <div className="text-center py-12 text-zinc-400 bg-zinc-800 rounded-lg border border-zinc-700">
                      <Clock size={48} className="mx-auto mb-4 text-zinc-600" />
                      <p>No availability posted yet</p>
                    </div>
                  ) : (
                    availability.map(avail => (
                      <div key={avail.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-white mb-1">
                            {formatDate(avail.available_date)}
                          </div>
                          <div className="text-sm text-zinc-400">
                            {avail.start_time} - {avail.end_time}
                          </div>
                          {avail.notes && (
                            <div className="text-sm text-zinc-500 mt-1">{avail.notes}</div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteAvailability(avail.id)}
                          className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-700 rounded text-sm transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

const ROLES = ["Audio Engineer", "Lighting Tech", "Rigger", "Stagehand", "Video Tech", "General Labor"];
