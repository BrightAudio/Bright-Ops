"use client";
import { useState } from "react";
import { useJobs, createJob } from "@/lib/hooks/useJobs";
import Link from "next/link";
import { Plus, Search, FileText, Undo2, Truck } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "complete", label: "Complete" },
];

export default function WarehouseJobsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", title: "", client: "" });
  const [creating, setCreating] = useState(false);
  const { data: jobs, loading, reload } = useJobs({ search, status });

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

  return (
    <main className="bg-zinc-900 text-gray-100 min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Warehouse Jobs</h1>
        <button
          className="flex items-center gap-2 bg-amber-500 text-black px-4 py-2 rounded hover:bg-amber-400"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus size={18} /> New Job
        </button>
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
      <div className="flex gap-4 mb-4">
        <div className="relative w-64">
          <input
            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 w-full text-white pl-9"
            placeholder="Search jobs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Search className="absolute left-2 top-2 text-gray-400" size={18} />
        </div>
        <select
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-zinc-800 text-sm">
          <thead>
            <tr className="text-left text-gray-400">
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Start</th>
              <th className="px-4 py-2">End</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">Loading...</td>
              </tr>
            ) : jobs && jobs.length > 0 ? (
              jobs.map((job) => (
                <tr key={job.id} className="border-b border-zinc-700 hover:bg-zinc-900">
                  <td className="px-4 py-2 font-mono font-bold">{job.code}</td>
                  <td className="px-4 py-2">{job.title}</td>
                  <td className="px-4 py-2">{job.client}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 rounded bg-zinc-700 text-xs">
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{job.start_at ? job.start_at.slice(0, 10) : ""}</td>
                  <td className="px-4 py-2">{job.end_at ? job.end_at.slice(0, 10) : ""}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <Link href={`/warehouse/jobs/${job.id}/prep-sheet`} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-700 rounded text-amber-300 hover:bg-zinc-600">
                      <FileText size={16} /> Prep
                    </Link>
                    <Link href={`/warehouse/jobs/${job.id}/return-manifest`} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-700 rounded text-green-300 hover:bg-zinc-600">
                      <Undo2 size={16} /> Return
                    </Link>
                    <Link href={`/warehouse/jobs/${job.id}/transports`} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-700 rounded text-blue-300 hover:bg-zinc-600">
                      <Truck size={16} /> Transports
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">No jobs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
