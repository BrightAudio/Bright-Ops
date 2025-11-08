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

export default function JobsPage() {
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
        <h1 className="text-2xl font-bold">Jobs</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map(job => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="bg-zinc-800 border border-zinc-700 rounded p-4 hover:border-amber-500 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-amber-400 font-mono text-sm">{job.code}</div>
                  <h3 className="font-semibold text-lg">{job.title}</h3>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  job.status === 'complete' ? 'bg-green-900 text-green-200' :
                  job.status === 'active' ? 'bg-blue-900 text-blue-200' :
                  'bg-zinc-700 text-zinc-300'
                }`}>
                  {job.status}
                </span>
              </div>
              {job.client_name && (
                <div className="text-sm text-zinc-400 mb-3">Client: {job.client_name}</div>
              )}
              <div className="flex gap-2 text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                  <FileText size={14} />
                  <span>Prep Sheet</span>
                </div>
                <div className="flex items-center gap-1">
                  <Undo2 size={14} />
                  <span>Returns</span>
                </div>
                <div className="flex items-center gap-1">
                  <Truck size={14} />
                  <span>Transport</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
