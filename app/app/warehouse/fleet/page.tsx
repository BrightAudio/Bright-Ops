"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface FleetVehicle {
  id: string;
  name: string;
  type: string | null;
  license_plate: string | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const vehicleTypes = ["Box Truck", "Van", "Trailer", "Pickup Truck", "Flatbed", "Other"];
const statuses = ["Active", "Maintenance", "Retired"];

function statusColor(status: string) {
  switch (status) {
    case "Active":
      return "bg-green-400/20 text-green-200 border-green-400/30";
    case "Maintenance":
      return "bg-amber-400/20 text-amber-200 border-amber-400/30";
    case "Retired":
      return "bg-red-400/20 text-red-200 border-red-400/30";
    default:
      return "bg-gray-400/20 text-gray-200 border-gray-400/30";
  }
}

export default function FleetPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FleetVehicle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    type: "",
    license_plate: "",
    status: "Active",
    notes: ""
  });

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    setLoading(true);
    const { data, error } = await supabase
      .from('fleet')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading fleet:', error);
    } else {
      setVehicles(data || []);
    }
    setLoading(false);
  }

  function openModal(vehicle?: FleetVehicle) {
    setEditing(vehicle ?? null);
    setForm(
      vehicle
        ? {
            name: vehicle.name,
            type: vehicle.type || "",
            license_plate: vehicle.license_plate || "",
            status: vehicle.status,
            notes: vehicle.notes || ""
          }
        : {
            name: "",
            type: "",
            license_plate: "",
            status: "Active",
            notes: ""
          }
    );
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setError(null);
  }

  function validateForm() {
    if (!form.name.trim()) return "Vehicle name is required.";
    return null;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      setError(err);
      return;
    }

    if (editing) {
      const { error } = await supabase
        .from('fleet')
        .update({
          name: form.name,
          type: form.type || null,
          license_plate: form.license_plate || null,
          status: form.status,
          notes: form.notes || null
        })
        .eq('id', editing.id);

      if (error) {
        setError('Failed to update vehicle');
        console.error(error);
        return;
      }
    } else {
      const { error } = await supabase
        .from('fleet')
        .insert({
          name: form.name,
          type: form.type || null,
          license_plate: form.license_plate || null,
          status: form.status,
          notes: form.notes || null
        });

      if (error) {
        setError('Failed to create vehicle');
        console.error(error);
        return;
      }
    }

    closeModal();
    loadVehicles();
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    const { error } = await supabase
      .from('fleet')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vehicle:', error);
      alert('Failed to delete vehicle');
    } else {
      loadVehicles();
    }
  }

  return (
    <>
      <DashboardLayout>
        <main className="min-h-screen bg-zinc-900 px-6 py-10 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="text-zinc-400 hover:text-white transition-colors"
                aria-label="Go back"
              >
                <i className="fas fa-arrow-left text-xl"></i>
              </button>
              <h1 className="text-3xl font-bold">Fleet Management</h1>
            </div>
            <button
              type="button"
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-3 rounded-lg shadow transition-colors"
              onClick={() => openModal()}
            >
              <i className="fas fa-plus mr-2"></i>
              Add Vehicle
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
              <p className="mt-4 text-gray-400">Loading fleet...</p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-12 bg-zinc-800 rounded-xl border border-zinc-700">
              <i className="fas fa-truck text-4xl text-zinc-600 mb-4"></i>
              <p className="text-gray-400 mb-4">No vehicles in your fleet yet</p>
              <button
                onClick={() => openModal()}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-2 rounded-lg"
              >
                Add Your First Vehicle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="bg-zinc-800 rounded-xl border border-zinc-700 p-6 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-1">{vehicle.name}</h3>
                      {vehicle.type && (
                        <p className="text-sm text-gray-400">{vehicle.type}</p>
                      )}
                    </div>
                    <span
                      className={`inline-block px-3 py-1 rounded-full border text-xs font-semibold ${statusColor(
                        vehicle.status
                      )}`}
                    >
                      {vehicle.status}
                    </span>
                  </div>

                  {vehicle.license_plate && (
                    <div className="mb-3">
                      <span className="text-xs text-gray-500">License Plate:</span>
                      <p className="text-sm font-mono bg-zinc-900 px-2 py-1 rounded mt-1 inline-block">
                        {vehicle.license_plate}
                      </p>
                    </div>
                  )}

                  {vehicle.notes && (
                    <p className="text-sm text-gray-400 mb-4">{vehicle.notes}</p>
                  )}

                  <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-700">
                    <button
                      onClick={() => openModal(vehicle)}
                      className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded transition-colors"
                    >
                      <i className="fas fa-edit mr-2"></i>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle.id)}
                      className="bg-red-900/20 hover:bg-red-900/40 text-red-400 px-4 py-2 rounded transition-colors border border-red-900/30"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </DashboardLayout>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[9999]"
          onClick={closeModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)'
          }}
        >
          <form
            className="bg-zinc-800 rounded-lg p-8 shadow-lg w-full max-w-md flex flex-col gap-4"
            style={{ backgroundColor: '#27272a' }}
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-2">
              {editing ? 'Edit Vehicle' : 'Add Vehicle'}
            </h2>

            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">Vehicle Name *</label>
              <input
                type="text"
                className="px-4 py-2 rounded bg-zinc-900 border border-zinc-700 text-white text-lg focus:outline-none focus:border-amber-400"
                placeholder="e.g., Box Truck #1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">Vehicle Type</label>
              <select
                className="px-4 py-2 rounded bg-zinc-900 border border-zinc-700 text-white text-lg focus:outline-none focus:border-amber-400"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="">Select type (optional)</option>
                {vehicleTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">License Plate</label>
              <input
                type="text"
                className="px-4 py-2 rounded bg-zinc-900 border border-zinc-700 text-white text-lg focus:outline-none focus:border-amber-400"
                placeholder="e.g., ABC-1234"
                value={form.license_plate}
                onChange={(e) => setForm({ ...form, license_plate: e.target.value })}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">Status</label>
              <select
                className="px-4 py-2 rounded bg-zinc-900 border border-zinc-700 text-white text-lg focus:outline-none focus:border-amber-400"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-gray-400 mb-1">Notes</label>
              <textarea
                className="px-4 py-2 rounded bg-zinc-900 border border-zinc-700 text-white text-lg focus:outline-none focus:border-amber-400"
                placeholder="Optional notes..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>

            {error && <div className="text-red-400 text-sm">{error}</div>}

            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                className="flex-1 bg-amber-500 text-black px-6 py-2 rounded font-bold hover:bg-amber-400"
              >
                {editing ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                className="bg-zinc-700 text-white px-6 py-2 rounded font-bold hover:bg-zinc-600"
                onClick={closeModal}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
