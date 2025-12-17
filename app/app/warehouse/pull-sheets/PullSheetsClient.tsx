'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createPullSheet,
  deletePullSheet,
  usePullSheets,
  PullSheetWithJob,
  updatePullSheet,
} from "@/lib/hooks/usePullSheets";
import type { PullsheetPermissions } from "@/lib/permissions";
import { supabase } from "@/lib/supabaseClient";
import { useLocation } from "@/lib/contexts/LocationContext";

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Picking", value: "picking" },
  { label: "Finalized", value: "finalized" },
];

function statusClass(status: string) {
  switch (status) {
    case "finalized":
      return "bg-green-500/20 text-green-200 border border-green-400/40";
    case "picking":
      return "bg-blue-500/20 text-blue-200 border border-blue-400/40";
    default:
      return "bg-white/10 text-white/70 border border-white/20";
  }
}

export type PullHandles = {
  canCreate: boolean;
  canDelete: boolean;
  canFinalize: boolean;
};

type JobOption = {
  id: string;
  code: string | null;
  title: string | null;
  status: string | null;
  start_at?: string | null;
  end_at?: string | null;
};

export default function PullSheetsClient({
  permissions,
}: {
  permissions: PullsheetPermissions;
}) {
  const router = useRouter();
  const { currentLocation } = useLocation();
  const { data: pullSheets, loading, error, refetch } = usePullSheets();
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    job_id: "",
    status: "draft",
    scheduled_out_at: "",
    expected_return_at: "",
    notes: "",
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, code, title, status, start_at, end_at")
        .order("created_at", { ascending: false })
        .limit(100);
      setJobs(data ?? []);
    })();
  }, []);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === form.job_id) ?? null,
    [jobs, form.job_id]
  );

  const canCreate = !!permissions?.can_create_pullsheets;
  const canDelete = !!permissions?.can_delete_pullsheets;

  function openModal() {
    if (!canCreate) {
      setCreateError("You do not have permission to create pull sheets.");
      return;
    }
    setCreateError(null);
    setForm({
      name: "",
      job_id: "",
      status: "draft",
      scheduled_out_at: "",
      expected_return_at: "",
      notes: "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSubmitting(false);
    setCreateError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) {
      setCreateError("You do not have permission to create pull sheets.");
      return;
    }
    setSubmitting(true);
    setCreateError(null);
    try {
      const name =
        form.name.trim() ||
        (selectedJob
          ? `${selectedJob.code ?? selectedJob.title ?? "Job"} Pull Sheet`
          : "Untitled Pull Sheet");
      
      // Get warehouse_id from job or current location
      let warehouse_id = null;
      
      // If job selected, get warehouse from job
      if (form.job_id) {
        const { data: jobData } = await supabase
          .from('jobs')
          .select('warehouse_id')
          .eq('id', form.job_id)
          .single();
        
        if (jobData) {
          warehouse_id = jobData.warehouse_id;
        }
      }
      
      // If no warehouse from job, use current location
      if (!warehouse_id && currentLocation && currentLocation !== 'All Locations') {
        const { data: warehouseData } = await supabase
          .from('warehouses')
          .select('id')
          .eq('name', currentLocation)
          .single();
        
        if (warehouseData) {
          warehouse_id = warehouseData.id;
        }
      }
      
      // Fallback to user's first accessible warehouse
      if (!warehouse_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: accessData } = await supabase
            .from('user_warehouse_access')
            .select('warehouse_id')
            .eq('user_id', user.id)
            .limit(1)
            .single();
          
          if (accessData) {
            warehouse_id = accessData.warehouse_id;
          }
        }
      }
      
      const payload = {
        name,
        job_id: form.job_id || null,
        status: form.status,
        scheduled_out_at: form.scheduled_out_at || null,
        expected_return_at: form.expected_return_at || null,
        notes: form.notes.trim() || null,
        warehouse_id: warehouse_id,
      };
      const created = await createPullSheet(payload);
      closeModal();
      refetch();
      router.push(`/app/warehouse/pull-sheets/${created.id}`);
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete(id: string) {
    if (!canDelete) {
      setDeleteError("You do not have permission to delete pull sheets.");
      return;
    }
    setDeleteError(null);
    setDeleteId(id);
    setConfirmingDelete(true);
  }

  async function handleDelete() {
    if (!deleteId) return;
    if (!canDelete) {
      setDeleteError("You do not have permission to delete pull sheets.");
      return;
    }
    try {
      await deletePullSheet(deleteId);
      setConfirmingDelete(false);
      setDeleteId(null);
      refetch();
    } catch (err) {
      setDeleteError((err as Error).message);
    }
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
  }

  function formatDateTimeLocal(value: string | null | undefined) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  async function updatePullSheetField(id: string, field: string, value: any) {
    if (!canCreate) return;
    setEditingIds(prev => new Set(prev).add(id));
    try {
      await updatePullSheet(id, { [field]: value });
      refetch();
    } catch (err) {
      console.error("Failed to update pull sheet:", err);
    } finally {
      setEditingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  }

  function jobLabel(job: PullSheetWithJob["jobs"]) {
    if (!job) return "—";
    if (job.code && job.title) return `${job.code} · ${job.title}`;
    return job.code ?? job.title ?? "—";
  }

  const permissionNotice = canCreate
    ? null
    : "Ask an owner to grant you pull sheet permissions.";

  return (
    <main className="min-h-screen bg-sky-50 px-6 py-10 text-gray-900">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Pull Sheets</h1>
          <p className="text-gray-600 text-sm mt-1 max-w-2xl">
            Create and manage pull sheets for jobs. Generate lists from confirmed work or build ad-hoc sheets for warehouse picks.
          </p>
        </div>
        {canCreate ? (
          <div className="flex gap-3">
          </div>
        ) : (
          <div className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-xs text-gray-600">
            No permission to create pull sheets
          </div>
        )}
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {permissionNotice && (
        <div className="mb-6 rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-xs text-gray-700">
          {permissionNotice}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-300 bg-gray-400 shadow-lg">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-900 font-bold bg-gray-300">
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Scheduled Out</th>
              <th className="px-6 py-4">Expected Return</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-600">
                  Loading pull sheets...
                </td>
              </tr>
            ) : pullSheets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="inline-block p-6 bg-gray-100 rounded-full mb-4">
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div className="text-xl font-semibold text-gray-800 mb-2">No Pull Sheets Yet</div>
                  <div className="text-gray-600 mb-6 max-w-md mx-auto">
                    Pull sheets help you organize equipment picks for jobs. Create one from a job or start fresh.
                  </div>
                  {canCreate && (
                    <button
                      onClick={openModal}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Your First Pull Sheet
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              pullSheets.map((sheet) => {
                const isEditing = editingIds.has(sheet.id);
                return (
                <tr key={sheet.id} className="border-t border-gray-300 hover:bg-amber-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    <div>{sheet.code}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {canCreate ? (
                        <select
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-gray-900 text-xs focus:border-amber-400 focus:outline-none disabled:opacity-50"
                          value={sheet.job_id ?? ""}
                          disabled={isEditing}
                          onChange={(e) => updatePullSheetField(sheet.id, "job_id", e.target.value || null)}
                        >
                          <option value="">No linked job</option>
                          {jobs.map((job) => (
                            <option key={job.id} value={job.id}>
                              {job.code ?? job.title ?? "Unnamed Job"}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-700">{jobLabel(sheet.jobs)}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-medium">
                    <Link href={`/app/warehouse/pull-sheets/${sheet.id}`} className="hover:text-amber-600 hover:underline">
                      {sheet.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    {canCreate ? (
                      <input
                        type="datetime-local"
                        className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-gray-900 text-sm focus:border-amber-400 focus:outline-none disabled:opacity-50"
                        value={formatDateTimeLocal(sheet.scheduled_out_at)}
                        disabled={isEditing}
                        onChange={(e) => updatePullSheetField(sheet.id, "scheduled_out_at", e.target.value || null)}
                      />
                    ) : (
                      <span className="text-gray-600">{formatDate(sheet.scheduled_out_at)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {canCreate ? (
                      <input
                        type="datetime-local"
                        className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-gray-900 text-sm focus:border-amber-400 focus:outline-none disabled:opacity-50"
                        value={formatDateTimeLocal(sheet.expected_return_at)}
                        disabled={isEditing}
                        onChange={(e) => updatePullSheetField(sheet.id, "expected_return_at", e.target.value || null)}
                      />
                    ) : (
                      <span className="text-gray-600">{formatDate(sheet.expected_return_at)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass(sheet.status)}`}>
                      {sheet.status.charAt(0).toUpperCase() + sheet.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/app/warehouse/pull-sheets/${sheet.id}`}
                        className="px-4 py-2 rounded-lg border-2 border-gray-700 text-gray-900 font-semibold hover:bg-amber-400 hover:border-amber-500 transition-all"
                      >
                        View
                      </Link>
                      {canDelete && (
                        <button
                          className="px-4 py-2 rounded-lg border-2 border-red-600 text-red-700 font-semibold bg-red-50 hover:bg-red-600 hover:text-white transition-all"
                          onClick={() => confirmDelete(sheet.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border-2 border-gray-200"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">New Pull Sheet</h2>
                <p className="text-sm text-gray-600">
                  Create a sheet from a confirmed quote/job or build one from scratch.
                </p>
              </div>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-900"
                onClick={closeModal}
              >
                <span aria-hidden>×</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wide text-gray-500 block mb-1">Pull Sheet Name</label>
                <input
                  className="w-full rounded-lg bg-white border border-gray-300 px-4 py-2 text-gray-900 focus:border-amber-400 focus:outline-none"
                  placeholder="Main Stage – Load Out"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-gray-500 block mb-1">Linked Job</label>
                <select
                  className="w-full rounded-lg bg-white border border-gray-300 px-4 py-2 text-gray-900 focus:border-amber-400 focus:outline-none"
                  value={form.job_id}
                  onChange={(e) => {
                    const jobId = e.target.value;
                    const selectedJob = jobs.find(j => j.id === jobId);
                    setForm((prev) => ({
                      ...prev,
                      job_id: jobId,
                      scheduled_out_at: selectedJob?.start_at ? formatDateTimeLocal(selectedJob.start_at) : prev.scheduled_out_at,
                      expected_return_at: selectedJob?.end_at ? formatDateTimeLocal(selectedJob.end_at) : prev.expected_return_at,
                    }));
                  }}
                >
                  <option value="">No linked job</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.code ?? job.title ?? "Unnamed Job"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wide text-gray-500 block mb-1">Scheduled Out</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg bg-white border border-gray-300 px-4 py-2 text-gray-900 focus:border-amber-400 focus:outline-none"
                    value={form.scheduled_out_at}
                    onChange={(e) => setForm((prev) => ({ ...prev, scheduled_out_at: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-gray-500 block mb-1">Expected Return</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg bg-white border border-gray-300 px-4 py-2 text-gray-900 focus:border-amber-400 focus:outline-none"
                    value={form.expected_return_at}
                    onChange={(e) => setForm((prev) => ({ ...prev, expected_return_at: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-gray-500 block mb-1">Status</label>
                <select
                  className="w-full rounded-lg bg-white border border-gray-300 px-4 py-2 text-gray-900 focus:border-amber-400 focus:outline-none"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-gray-500 block mb-1">Notes</label>
                <textarea
                  className="w-full rounded-lg bg-white border border-gray-300 px-4 py-2 text-gray-900 focus:border-amber-400 focus:outline-none"
                  rows={3}
                  placeholder="Special pickup instructions, staffing notes, etc."
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            {createError && (
              <div className="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {createError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:border-gray-400"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitting}
              >
                {submitting ? "Creating…" : "Create Pull Sheet"}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border-2 border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Delete pull sheet?</h3>
            <p className="mt-2 text-sm text-gray-600">
              This action cannot be undone. The pull sheet and its items will be removed permanently.
            </p>
            {deleteError && (
              <div className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:border-gray-400"
                onClick={() => {
                  setConfirmingDelete(false);
                  setDeleteId(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
