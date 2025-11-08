
"use client";
import { useEffect, useState } from "react";
import { supabase, Tables, TablesInsert, TablesUpdate } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";

function formatTime(ts: string) {
  return ts ? new Date(ts).toLocaleString() : "";
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export default function TransportsScheduler() {
  const { id } = useParams();
  const [transports, setTransports] = useState<Tables<"transports">[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"transports"> | null>(null);
  const [form, setForm] = useState<TablesInsert<"transports">>({
    job_id: id,
    vehicle: "",
    driver: "",
    depart_at: "",
    arrive_at: "",
    notes: ""
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("transports")
        .select("*")
        .eq("job_id", id)
        .order("depart_at", { ascending: true });
      setTransports(data ?? []);
    })();
  }, [id, modalOpen]);

  function openModal(transport?: Tables<"transports">) {
    setEditing(transport ?? null);
    setForm(
      transport
        ? { ...transport }
        : { job_id: id, vehicle: "", driver: "", depart_at: "", arrive_at: "", notes: "" }
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
    if (!form.vehicle.trim() || !form.driver.trim()) return "Vehicle and driver required.";
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
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-gray-100 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transports</h1>
        <button
          className="bg-amber-500 text-black px-6 py-3 rounded font-bold"
          onClick={() => openModal()}
        >
          Add Transport
        </button>
      </header>
      <div className="space-y-4">
        {transports.map(t => (
          <div key={t.id} className="bg-zinc-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="font-semibold text-lg mb-1">{t.vehicle} — {t.driver}</div>
              <div className="flex gap-2 items-center mb-1">
                <span className="bg-amber-600 text-black px-3 py-1 rounded-full font-mono text-sm">
                  {formatTime(t.depart_at)} → {formatTime(t.arrive_at)}
                </span>
              </div>
              <div className="flex gap-2 text-sm">
                <button
                  className="underline text-amber-400"
                  onClick={() => copyToClipboard(t.notes)}
                  title="Copy notes"
                >
                  Copy Notes
                </button>
                {/* If you have address, add copy button here */}
              </div>
            </div>
            <button
              className="bg-gray-700 text-white px-4 py-2 rounded"
              onClick={() => openModal(t)}
            >
              Edit
            </button>
          </div>
        ))}
      </div>
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <form
            className="bg-zinc-900 rounded-lg p-8 shadow-lg w-full max-w-md flex flex-col gap-4"
            onSubmit={handleSave}
          >
            <h2 className="text-xl font-bold mb-2">{editing ? "Edit" : "Add"} Transport</h2>
            <input
              className="px-4 py-2 rounded bg-zinc-800 border border-zinc-700 text-lg"
              placeholder="Vehicle"
              value={form.vehicle}
              onChange={e => setForm((f: TablesInsert<"transports">) => ({ ...f, vehicle: e.target.value }))}
              required
            />
            <input
              className="px-4 py-2 rounded bg-zinc-800 border border-zinc-700 text-lg"
              placeholder="Driver"
              value={form.driver}
              onChange={e => setForm((f: TablesInsert<"transports">) => ({ ...f, driver: e.target.value }))}
              required
            />
            <label className="text-sm">Departure</label>
            <input
              type="datetime-local"
              className="px-4 py-2 rounded bg-zinc-800 border border-zinc-700 text-lg"
              value={form.depart_at}
              onChange={e => setForm((f: TablesInsert<"transports">) => ({ ...f, depart_at: e.target.value }))}
              required
            />
            <label className="text-sm">Arrival</label>
            <input
              type="datetime-local"
              className="px-4 py-2 rounded bg-zinc-800 border border-zinc-700 text-lg"
              value={form.arrive_at}
              onChange={e => setForm((f: TablesInsert<"transports">) => ({ ...f, arrive_at: e.target.value }))}
              required
            />
            <textarea
              className="px-4 py-2 rounded bg-zinc-800 border border-zinc-700 text-lg"
              placeholder="Notes"
              value={form.notes}
              onChange={e => setForm((f: TablesInsert<"transports">) => ({ ...f, notes: e.target.value }))}
            />
            {error && <div className="text-red-400 text-sm">{error}</div>}
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                className="bg-amber-500 text-black px-6 py-2 rounded font-bold"
              >
                Save
              </button>
              <button
                type="button"
                className="bg-gray-700 text-white px-6 py-2 rounded font-bold"
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
