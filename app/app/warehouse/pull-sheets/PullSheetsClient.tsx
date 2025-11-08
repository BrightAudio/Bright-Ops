'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createPullSheet,
  deletePullSheet,
  usePullSheets,
  PullSheetWithJob,
} from "@/lib/hooks/usePullSheets";
import type { PullsheetPermissions } from "@/lib/permissions";
import { supabase } from "@/lib/supabaseClient";

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
};

export default function PullSheetsClient({
  permissions,
}: {
  permissions: PullsheetPermissions;
}) {
  const router = useRouter();
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

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, code, title, status")
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
      const payload = {
        name,
        job_id: form.job_id || null,
        status: form.status,
        scheduled_out_at: form.scheduled_out_at || null,
        expected_return_at: form.expected_return_at || null,
        notes: form.notes.trim() || null,
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

  function jobLabel(job: PullSheetWithJob["jobs"]) {
    if (!job) return "—";
    if (job.code && job.title) return `${job.code} · ${job.title}`;
    return job.code ?? job.title ?? "—";
  }

  const permissionNotice = canCreate
    ? null
    : "Ask an owner to grant you pull sheet permissions.";

  return (
    <main className="min-h-screen bg-[#0c0d10] px-6 py-10 text-white">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Pull Sheets</h1>
          <p className="text-white/60 text-sm mt-1 max-w-2xl">
            Create and manage Flex-style pull sheets for jobs. Generate lists from confirmed work or build ad-hoc sheets for warehouse picks.
          </p>
        </div>
        {canCreate ? (
          <button
            className="bg-amber-400 text-[#0c0d10] px-6 py-3 rounded-lg font-semibold shadow hover:bg-amber-300 transition-colors"
            onClick={openModal}
          >
            + New Pull Sheet
          </button>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60">
            No permission to create pull sheets
          </div>
        )}
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200">
          {error}
        </div>
      )}

      {permissionNotice && (
        <div className="mb-6 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
          {permissionNotice}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#181a20]">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-white/60">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Scheduled Out</th>
              <th className="px-4 py-3">Expected Return</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-white/40">
                  Loading pull sheets...
                </td>
              </tr>
            ) : pullSheets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-white/40">
                  No pull sheets yet. Create one to start organizing your picks.
                </td>
              </tr>
            ) : (
              pullSheets.map((sheet) => (
                <tr key={sheet.id} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-semibold text-white/80">{sheet.code}</td>
                  <td className="px-4 py-3 text-white">
                    <Link href={`/app/warehouse/pull-sheets/${sheet.id}`} className="hover:text-amber-300">
                      {sheet.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/70">{jobLabel(sheet.jobs)}</td>
                  <td className="px-4 py-3 text-white/60">{formatDate(sheet.scheduled_out_at)}</td>
                  <td className="px-4 py-3 text-white/60">{formatDate(sheet.expected_return_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass(sheet.status)}`}>
                      {sheet.status.charAt(0).toUpperCase() + sheet.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/app/warehouse/pull-sheets/${sheet.id}`}
                        className="px-3 py-1.5 rounded border border-white/20 text-white/80 hover:border-amber-400 hover:text-amber-200"
                      >
                        View
                      </Link>
                      {canDelete && (
                        <button
                          className="px-3 py-1.5 rounded border border-red-500/50 text-red-200 hover:bg-red-500/10"
                          onClick={() => confirmDelete(sheet.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-lg rounded-xl bg-[#181a20] p-6 shadow-2xl border border-white/10"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">New Pull Sheet</h2>
                <p className="text-sm text-white/60">
                  Create a sheet from a confirmed quote/job or build one from scratch.
                </p>
              </div>
              <button
                type="button"
                className="text-white/50 hover:text-white"
                onClick={closeModal}
              >
                <span aria-hidden>×</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wide text-white/50 block mb-1">Pull Sheet Name</label>
                <input
                  className="w-full rounded-lg bg-[#0c0d10] border border-white/10 px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
                  placeholder="Main Stage – Load Out"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-white/50 block mb-1">Linked Job</label>
                <select
                  className="w-full rounded-lg bg-[#0c0d10] border border-white/10 px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
                  value={form.job_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, job_id: e.target.value }))}
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
                  <label className="text-xs uppercase tracking-wide text-white/50 block mb-1">Scheduled Out</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg bg-[#0c0d10] border border-white/10 px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
                    value={form.scheduled_out_at}
                    onChange={(e) => setForm((prev) => ({ ...prev, scheduled_out_at: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-white/50 block mb-1">Expected Return</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg bg-[#0c0d10] border border-white/10 px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
                    value={form.expected_return_at}
                    onChange={(e) => setForm((prev) => ({ ...prev, expected_return_at: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-white/50 block mb-1">Status</label>
                <select
                  className="w-full rounded-lg bg-[#0c0d10] border border-white/10 px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
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
                <label className="text-xs uppercase tracking-wide text-white/50 block mb-1">Notes</label>
                <textarea
                  className="w-full rounded-lg bg-[#0c0d10] border border-white/10 px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
                  rows={3}
                  placeholder="Special pickup instructions, staffing notes, etc."
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            {createError && (
              <div className="mt-4 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {createError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded border border-white/20 text-white/80 hover:border-white/40"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-amber-400 text-[#0c0d10] font-semibold hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
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
          <div className="w-full max-w-md rounded-xl bg-[#181a20] p-6 shadow-2xl border border-white/10">
            <h3 className="text-lg font-semibold text-white">Delete pull sheet?</h3>
            <p className="mt-2 text-sm text-white/60">
              This action cannot be undone. The pull sheet and its items will be removed permanently.
            </p>
            {deleteError && (
              <div className="mt-3 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded border border-white/20 text-white/80 hover:border-white/40"
                onClick={() => {
                  setConfirmingDelete(false);
                  setDeleteId(null);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-500/80 text-white font-semibold hover:bg-red-500"
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
