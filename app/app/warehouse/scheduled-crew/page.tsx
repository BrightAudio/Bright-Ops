"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";

const ROLES = ["Audio Engineer", "Lighting Tech", "Rigger", "Stagehand", "Video Tech", "General Labor"];

type Employee = {
  id: string;
  name: string;
  role: string | null;
  hourly_rate: number | null;
};

type JobPosition = {
  id?: string;
  job_id: string;
  role: string;
  employee_id: string | null;
  employee_name?: string;
  rate_type: 'day' | 'hourly' | null;
  rate_amount: number | null;
  status?: string;
  requested_at?: string | null;
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

export default function ScheduledCrew() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Record<string, JobPosition[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [pendingRequests, setPendingRequests] = useState<JobPosition[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    console.log("Starting loadData...");
    
    try {
      // Load open/active jobs - exclude archived/deleted jobs
      console.log("Fetching jobs from Supabase (excluding archived)...");
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .eq('archived', false)
        .order("created_at", { ascending: false });

      console.log("Jobs query result:", { data: jobsData, error: jobsError });

      if (jobsError) {
        console.error("Error loading jobs:", jobsError.message, jobsError);
        throw new Error(`Jobs error: ${jobsError.message}`);
      }
      console.log("Loaded all jobs:", jobsData);
      
      // Filter to open jobs (not completed) - using 'as any' to bypass type issues
      const openJobs = ((jobsData || []) as any[]).filter((job: any) => 
        job.status !== 'completed' && job.status !== 'cancelled'
      );
      console.log("Open jobs:", openJobs);
      setJobs(openJobs);

      // Load employees
      console.log("Fetching employees from Supabase...");
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("id, name, role, hourly_rate")
        .order("name");

      console.log("Employees query result:", { data: employeesData, error: employeesError });

      if (employeesError) {
        console.error("Error loading employees:", employeesError.message, employeesError);
        throw new Error(`Employees error: ${employeesError.message}`);
      }
      console.log("Loaded employees:", employeesData);
      setEmployees(employeesData || []);

      // Load job assignments
      console.log("Fetching job assignments from Supabase...");
      const { data: assignmentsData, error: assignmentsError} = await supabase
        .from("job_assignments")
        .select(`
          id,
          job_id,
          role,
          employee_id,
          rate_type,
          rate_amount,
          status,
          requested_at,
          employees (name)
        `);

      console.log("Assignments query result:", { data: assignmentsData, error: assignmentsError });

      if (assignmentsError) {
        console.error("Error loading assignments:", assignmentsError.message, assignmentsError);
        // Don't throw - assignments might not exist yet
        console.log("No assignments found, continuing...");
      }

      // Group assignments by job and separate pending requests
      const positionsByJob: Record<string, JobPosition[]> = {};
      const pending: JobPosition[] = [];
      
      assignmentsData?.forEach((assignment: any) => {
        const position = {
          id: assignment.id,
          job_id: assignment.job_id,
          role: assignment.role,
          employee_id: assignment.employee_id,
          employee_name: assignment.employees?.name,
          rate_type: assignment.rate_type,
          rate_amount: assignment.rate_amount,
          status: assignment.status || 'assigned',
          requested_at: assignment.requested_at,
        };

        if (assignment.status === 'pending') {
          pending.push(position);
        }

        if (!positionsByJob[assignment.job_id]) {
          positionsByJob[assignment.job_id] = [];
        }
        positionsByJob[assignment.job_id].push(position);
      });

      setPositions(positionsByJob);
      setPendingRequests(pending);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }

  function toggleJob(jobId: string) {
    setExpandedJobs(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }

  async function addPosition(jobId: string) {
    const newPosition: JobPosition = {
      job_id: jobId,
      role: ROLES[0],
      employee_id: null,
      rate_type: null,
      rate_amount: null,
    };

    try {
      const { data, error } = await supabase
        .from("job_assignments")
        .insert([newPosition as any])
        .select()
        .single();

      if (error) throw error;

      setPositions(prev => ({
        ...prev,
        [jobId]: [...(prev[jobId] || []), { ...newPosition, id: (data as any).id }],
      }));
    } catch (err) {
      console.error("Error adding position:", err);
    }
  }

  async function updatePosition(jobId: string, positionId: string, field: "role" | "employee_id" | "rate_type" | "rate_amount", value: string | number | null) {
    try {
      const { error } = await supabase
        .from("job_assignments")
        .update({ [field]: value } as any)
        .eq("id", positionId);

      if (error) throw error;

      setPositions(prev => ({
        ...prev,
        [jobId]: prev[jobId].map(p =>
          p.id === positionId
            ? {
                ...p,
                [field]: value,
                ...(field === "employee_id" && value
                  ? { employee_name: employees.find(e => e.id === value)?.name }
                  : {}),
              }
            : p
        ),
      }));
    } catch (err) {
      console.error("Error updating position:", err);
    }
  }

  async function deletePosition(jobId: string, positionId: string) {
    try {
      const { error } = await supabase
        .from("job_assignments")
        .delete()
        .eq("id", positionId);

      if (error) throw error;

      setPositions(prev => ({
        ...prev,
        [jobId]: prev[jobId].filter(p => p.id !== positionId),
      }));
    } catch (err) {
      console.error("Error deleting position:", err);
    }
  }

  async function approveVolunteer(positionId: string, jobId: string) {
    try {
      const { error } = await supabase
        .from("job_assignments")
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq("id", positionId);

      if (error) throw error;
      alert("Volunteer request approved!");
      loadData();
    } catch (err) {
      console.error("Error approving volunteer:", err);
      alert("Failed to approve request");
    }
  }

  async function rejectVolunteer(positionId: string) {
    try {
      const { error } = await supabase
        .from("job_assignments")
        .delete()
        .eq("id", positionId);

      if (error) throw error;
      loadData();
    } catch (err) {
      console.error("Error rejecting volunteer:", err);
    }
  }

  function getEmployeesForRole(role: string) {
    // Show all employees in dropdown (not filtered by role)
    return employees;
  }

  return (
    <DashboardLayout>
    <main className="min-h-screen bg-zinc-900 px-6 py-10 text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Crew Planner</h1>
        <div className="flex gap-2">
          <Link
            href="/app/crew/portal"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <i className="fas fa-user"></i>
            Crew Portal
          </Link>
          <Link
            href="/app/crew"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-2 border border-zinc-700"
          >
            <i className="fas fa-users"></i>
            Manage Employees
          </Link>
        </div>
      </div>

      {/* Pending Volunteer Requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-8 bg-yellow-900/20 border border-yellow-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-300 mb-4 flex items-center gap-2">
            <i className="fas fa-clock"></i>
            Pending Volunteer Requests ({pendingRequests.length})
          </h2>
          <div className="space-y-3">
            {pendingRequests.map(req => {
              const job = jobs.find(j => j.id === req.job_id);
              return (
                <div key={req.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-white">
                      {req.employee_name} → {req.role}
                    </div>
                    <div className="text-sm text-zinc-400">
                      Job: {job?.code} - {job?.title}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      Requested: {req.requested_at ? new Date(req.requested_at).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveVolunteer(req.id!, req.job_id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-semibold transition-colors"
                    >
                      <i className="fas fa-check mr-2"></i>
                      Approve
                    </button>
                    <button
                      onClick={() => rejectVolunteer(req.id!)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-semibold transition-colors"
                    >
                      <i className="fas fa-times mr-2"></i>
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No open jobs found. Create a job to start planning crew.
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => {
            const isExpanded = expandedJobs.has(job.id);
            const jobPositions = positions[job.id] || [];

            return (
              <div
                key={job.id}
                className="rounded-xl border border-zinc-700 bg-zinc-800"
              >
                {/* Job Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-700/50"
                  onClick={() => toggleJob(job.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <i className={`fas fa-chevron-${isExpanded ? "down" : "right"} text-gray-400`}></i>
                      <div>
                        <div className="font-semibold text-lg">
                          {job.code} - {job.title}
                        </div>
                        <div className="text-sm text-gray-400">
                          {job.start_at && new Date(job.start_at).toLocaleDateString()}
                          {job.venue && ` • ${job.venue}`}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {jobPositions.length} position{jobPositions.length !== 1 ? "s" : ""}
                  </div>
                </div>

                {/* Positions List */}
                {isExpanded && (
                  <div className="border-t border-zinc-700 p-4 space-y-3">
                    {jobPositions.map(position => (
                      <div
                        key={position.id}
                        className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg"
                      >
                        {/* Role Select */}
                        <select
                          value={position.role}
                          onChange={(e) => updatePosition(job.id, position.id!, "role", e.target.value)}
                          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-amber-400 min-w-[180px]"
                        >
                          {ROLES.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>

                        {/* Employee Select */}
                        <select
                          value={position.employee_id || ""}
                          onChange={(e) => updatePosition(job.id, position.id!, "employee_id", e.target.value || null)}
                          className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-amber-400"
                        >
                          <option value="">Unassigned</option>
                          {getEmployeesForRole(position.role).map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name}
                            </option>
                          ))}
                        </select>

                        {/* Rate Type Select */}
                        <select
                          value={position.rate_type || ""}
                          onChange={(e) => {
                            const rateType = e.target.value || null;
                            updatePosition(job.id, position.id!, "rate_type", rateType);
                            // Clear rate amount when changing type
                            if (rateType !== position.rate_type) {
                              updatePosition(job.id, position.id!, "rate_amount", null);
                            }
                          }}
                          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-amber-400 min-w-[120px]"
                        >
                          <option value="">No Rate</option>
                          <option value="day">Day Rate</option>
                          <option value="hourly">Hourly</option>
                        </select>

                        {/* Rate Amount Input */}
                        {position.rate_type && (
                          <input
                            type="number"
                            value={position.rate_amount || ""}
                            onChange={(e) => updatePosition(job.id, position.id!, "rate_amount", e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder={position.rate_type === 'day' ? 'Day rate' : 'Hourly rate'}
                            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-amber-400 w-[120px]"
                          />
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => deletePosition(job.id, position.id!)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                          title="Remove position"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    ))}

                    {/* Add Position Button */}
                    <button
                      onClick={() => addPosition(job.id)}
                      className="w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-plus"></i>
                      Add Position
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
    </DashboardLayout>
  );
}
