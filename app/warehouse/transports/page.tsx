"use client";

import { useState, useEffect } from "react";
import { supabase, Tables, TablesInsert, TablesUpdate } from "@/lib/supabaseClient";
import { useTransports } from "@/lib/hooks/useTransports";

const warehouses = ["Main", "Annex", "Remote"];
const vehicles = ["Truck 1", "Truck 2", "Van"];
const statuses = ["Planned", "En route", "Delivered"];

function statusColor(status: string) {
  switch (status) {
    case "Planned":
      return "bg-amber-400/20 text-amber-200 border-amber-400/30";
    case "En route":
      return "bg-blue-400/20 text-blue-200 border-blue-400/30";
    case "Delivered":
      return "bg-green-400/20 text-green-200 border-green-400/30";
    default:
      return "bg-white/10 text-white/70 border-white/20";
  }
}

export default function Transports() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"transports"> | null>(null);
  const [form, setForm] = useState<TablesInsert<"transports">>({
    job_id: "",
    vehicle: "",
    driver: "",
    depart_at: "",
    arrive_at: "",
    notes: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [transports, setTransports] = useState<Tables<"transports">[]>([]);

  useEffect(() => {
    loadTransports();
  }, []);

  async function loadTransports() {
    const { data } = await supabase
      .from("transports")
      .select("*")
      .order("depart_at", { ascending: false });
    setTransports(data ?? []);
  }

  function openModal(transport?: Tables<"transports">) {
    setEditing(transport ?? null);
    setForm(
      transport
        ? { ...transport }
        : { job_id: "", vehicle: "", driver: "", depart_at: "", arrive_at: "", notes: "" }
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
    if (!form.vehicle?.trim() || !form.driver?.trim()) return "Vehicle and driver required.";
    if (!form.depart_at || !form.arrive_at) return "Times required.";
    if (new Date(form.arrive_at) < new Date(form.depart_at)) return "Arrival must be after departure.";
    return null;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const err = validateForm();
    if (err) return setError(err);
    if (editing) {
      await supabase
        .from("transports")
        .update(form as TablesUpdate<"transports">)
        .eq("id", editing.id);
    } else {
      await supabase
        .from("transports")
        .insert(form as TablesInsert<"transports">);
    }
    closeModal();
    loadTransports();
  }

  function formatDateTime(dt: string) {
    if (!dt) return "";
    return new Date(dt).toLocaleString();
  }

  // Filter logic
  const filtered = transports.filter(t =>
    (!vehicle || t.vehicle === vehicle) &&
    (!status || t.status === status)
  );

  return (
    <main className="min-h-screen bg-[#0c0d10] px-6 py-10 text-white">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold">Transports</h1>
        <button
          type="button"
          className="bg-amber-400/90 hover:bg-amber-400 text-[#0c0d10] font-semibold px-6 py-3 rounded-lg shadow transition-colors border border-amber-400/30"
          onClick={() => openModal()}
        >
          + New Transport
        </button>
      </div>
      <form className="flex flex-wrap gap-4 mb-6 items-end">
        <div className="flex flex-col">
          <label className="text-sm mb-1 text-white/70">Date From</label>
          <input type="date" className="bg-[#181a20] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1 text-white/70">Date To</label>
          <input type="date" className="bg-[#181a20] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1 text-white/70">Warehouse</label>
          <select className="bg-[#181a20] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400" value={warehouse} onChange={e => setWarehouse(e.target.value)}>
            <option value="">All</option>
            {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1 text-white/70">Vehicle</label>
          <select className="bg-[#181a20] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400" value={vehicle} onChange={e => setVehicle(e.target.value)}>
            <option value="">All</option>
            {vehicles.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm mb-1 text-white/70">Status</label>
          <select className="bg-[#181a20] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </form>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#181a20]">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-white/70 text-sm">
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Depart</th>
              <th className="px-4 py-3">Arrive</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-white/40">No transports found.</td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="border-t border-white/10">
                  <td className="px-4 py-3">{t.vehicle}</td>
                  <td className="px-4 py-3">{t.driver}</td>
                  <td className="px-4 py-3">{formatDateTime(t.depart_at ?? "")}</td>
                  <td className="px-4 py-3">{formatDateTime(t.arrive_at ?? "")}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-3 py-1 rounded-full border text-xs font-semibold ${statusColor(t.status ?? "")}`}>{t.status ?? "Unknown"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600"
                      onClick={() => openModal(t)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <form
            className="bg-[#181a20] rounded-lg p-8 shadow-lg w-full max-w-md flex flex-col gap-4"
            onSubmit={handleSave}
          >
            <h2 className="text-xl font-bold mb-2">{editing ? "Edit" : "Add"} Transport</h2>
            <input
              className="px-4 py-2 rounded bg-[#0c0d10] border border-white/10 text-white text-lg"
              placeholder="Vehicle"
              value={form.vehicle ?? ""}
              onChange={e => setForm(f => ({ ...f, vehicle: e.target.value }))}
              required
            />
            <input
              className="px-4 py-2 rounded bg-[#0c0d10] border border-white/10 text-white text-lg"
              placeholder="Driver"
              value={form.driver ?? ""}
              onChange={e => setForm(f => ({ ...f, driver: e.target.value }))}
              required
            />
            <label className="text-sm text-white/70">Departure</label>
            <input
              type="datetime-local"
              className="px-4 py-2 rounded bg-[#0c0d10] border border-white/10 text-white text-lg"
              value={form.depart_at ?? ""}
              onChange={e => setForm(f => ({ ...f, depart_at: e.target.value }))}
              required
            />
            <label className="text-sm text-white/70">Arrival</label>
            <input
              type="datetime-local"
              className="px-4 py-2 rounded bg-[#0c0d10] border border-white/10 text-white text-lg"
              value={form.arrive_at ?? ""}
              onChange={e => setForm(f => ({ ...f, arrive_at: e.target.value }))}
              required
            />
            <input
              className="px-4 py-2 rounded bg-[#0c0d10] border border-white/10 text-white text-lg"
              placeholder="Job ID (optional)"
              value={form.job_id ?? ""}
              onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}
            />
            <textarea
              className="px-4 py-2 rounded bg-[#0c0d10] border border-white/10 text-white text-lg"
              placeholder="Notes"
              value={form.notes ?? ""}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
            <select
              className="px-4 py-2 rounded bg-[#0c0d10] border border-white/10 text-white text-lg"
              value={form.status || "Planned"}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            >
              <option value="Planned">Planned</option>
              <option value="En route">En route</option>
              <option value="Delivered">Delivered</option>
            </select>
            {error && <div className="text-red-400 text-sm">{error}</div>}
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                className="bg-amber-400 text-[#0c0d10] px-6 py-2 rounded font-bold hover:bg-amber-300"
              >
                Save
              </button>
              <button
                type="button"
                className="bg-gray-700 text-white px-6 py-2 rounded font-bold hover:bg-gray-600"
                onClick={closeModal}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
