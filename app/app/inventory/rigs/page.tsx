"use client";

import { useState } from "react";
import Link from "next/link";
import { useRigContainers, createRigContainer, deleteRigContainer } from "@/lib/hooks/useRigContainers";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Package, Plus, Edit, Trash2 } from "lucide-react";

export default function RigContainersPage() {
  const { data: rigs, loading, error, reload } = useRigContainers();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    location: "",
  });
  const [creating, setCreating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setLocalError("Name is required");
      return;
    }
    
    setCreating(true);
    setLocalError(null);
    try {
      await createRigContainer({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category || undefined,
        location: form.location.trim() || undefined,
      });
      setForm({ name: "", description: "", category: "", location: "" });
      setShowForm(false);
      reload();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to create rig");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete rig "${name}"? This will also remove all items from this rig.`)) {
      return;
    }
    
    try {
      await deleteRigContainer(id);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete rig");
    }
  }

  return (
    <DashboardLayout>
      <main className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Package className="text-amber-400" />
              Rig Containers
            </h1>
            <p className="text-zinc-400 mt-1">
              Create preset equipment groupings for quick deployment
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <Plus size={20} />
            New Rig
          </button>
        </div>

        {showForm && (
          <div className="mb-6 bg-zinc-800 border border-zinc-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Create New Rig</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1">
                  Rig Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-900 text-white"
                  placeholder="e.g., Standard PA System, Small Gig Kit"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-900 text-white"
                  rows={3}
                  placeholder="Brief description of this rig configuration..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-900 text-white"
                >
                  <option value="">Select category...</option>
                  <option value="pa_systems">PA Systems</option>
                  <option value="lighting">Lighting</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="staging">Staging</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-1">
                  Default Location
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-900 text-white"
                  placeholder="e.g., Warehouse Bay 3, Storage Room A"
                />
              </div>
              {localError && (
                <div className="text-red-400 text-sm">{localError}</div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm({ name: "", description: "", category: "", location: "" });
                    setLocalError(null);
                  }}
                  className="px-4 py-2 border border-zinc-600 text-zinc-200 rounded-md hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Rig"}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-zinc-400">Loading rigs...</p>
        ) : error ? (
          <p className="text-red-500">{String(error)}</p>
        ) : !rigs || rigs.length === 0 ? (
          <div className="text-center py-12 bg-zinc-800 border border-zinc-700 rounded-lg">
            <Package size={48} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400 text-lg mb-2">No rigs created yet</p>
            <p className="text-zinc-500 text-sm">
              Create your first rig container to group equipment for quick deployment
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rigs.map((rig) => (
              <div
                key={rig.id}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 hover:border-amber-500 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {rig.name}
                    </h3>
                    {rig.category && (
                      <span className="inline-block px-2 py-1 text-xs rounded bg-blue-900 text-blue-200">
                        {rig.category.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/app/inventory/rigs/${rig.id}`}
                      className="p-2 text-blue-400 hover:text-blue-300 hover:bg-zinc-700 rounded"
                    >
                      <Edit size={16} />
                    </Link>
                    <button
                      onClick={() => handleDelete(rig.id, rig.name)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-zinc-700 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {rig.description && (
                  <p className="text-zinc-400 text-sm mb-3">
                    {rig.description}
                  </p>
                )}
                <div className="text-xs text-zinc-500">
                  Created {new Date(rig.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
