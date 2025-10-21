
"use client";
import { useEffect, useRef, useState } from "react";
import { supabase, Tables, TablesUpdate } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";
import clsx from "clsx";

function playSound(type: "success" | "error") {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = type === "success" ? 880 : 220;
  osc.connect(ctx.destination);
  osc.start();
  setTimeout(() => {
    osc.stop();
    ctx.close();
  }, type === "success" ? 120 : 350);
}

export default function ReturnManifestScan() {
  const { id } = useParams();
  const [job, setJob] = useState<Tables<"jobs"> | null>(null);
  const [manifest, setManifest] = useState<Tables<"return_manifest"> | null>(null);
  const [items, setItems] = useState<Array<Tables<"return_manifest_items"> & { barcode: string; name: string }> | null>(null);
  const [barcode, setBarcode] = useState("");
  const [flashRow, setFlashRow] = useState<{ id: number; color: "green" | "red" } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
    (async () => {
      setLoading(true);
      // Fetch job, manifest, and items
      const { data: jobData } = await supabase.from("jobs").select("*").eq("id", id).single();
      setJob(jobData);
      const { data: manifestData } = await supabase.from("return_manifest").select("*").eq("job_id", id).single();
      setManifest(manifestData);
      const { data: itemData } = await supabase
        .from("return_manifest_items")
        .select("*, inventory:inventory_id(barcode, name)")
        .eq("manifest_id", manifestData?.id);
      setItems(
        itemData?.map((i: any) => ({
          ...i,
          barcode: i.inventory?.barcode ?? "",
          name: i.inventory?.name ?? "",
        })) ?? []
      );
      setLoading(false);
    })();
  }, [id]);

  function getStatus() {
    if (!items) return "open";
    const allReturned = items.every(i => i.returned >= i.expected);
    return allReturned ? "closed" : "open";
  }

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!barcode.trim() || !items) return;
    const idx = items.findIndex(i => i.barcode === barcode.trim());
    if (idx === -1) {
      playSound("error");
      setFlashRow({ id: -1, color: "red" });
      setTimeout(() => setFlashRow(null), 600);
      setBarcode("");
      return;
    }
    const item = items[idx];
    const remaining = item.expected - item.returned;
    if (remaining <= 0) {
      playSound("error");
      setFlashRow({ id: item.id, color: "red" });
      setTimeout(() => setFlashRow(null), 600);
      setBarcode("");
      return;
    }
    // Optimistic UI
    const newItems = [...items];
    newItems[idx] = { ...item, returned: item.returned + 1 };
    setItems(newItems);
    playSound("success");
    setFlashRow({ id: item.id, color: "green" });
    setTimeout(() => setFlashRow(null), 600);
    setBarcode("");
    // Persist returned count
    await supabase
      .from("return_manifest_items")
      .update({ returned: item.returned + 1 } as TablesUpdate<"return_manifest_items">)
      .eq("id", item.id);
    // Also increment inventory_items.qty_in_warehouse
    await supabase
      .from("inventory_items")
      .update({ qty_in_warehouse: supabase.rpc('increment_qty_in_warehouse', { inventory_id: item.inventory_id, amount: 1 }) })
      .eq("inventory_id", item.inventory_id);
  }

  async function closeManifest() {
    if (!manifest || !items) return;
    const allReturned = items.every(i => i.returned >= i.expected);
    if (!allReturned) return;
    setManifest({ ...manifest, status: "closed" });
    await supabase
      .from("return_manifest")
      .update({ status: "closed" } as TablesUpdate<"return_manifest">)
      .eq("id", manifest.id);
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-gray-100 p-6">
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Return Manifest: {job?.code || job?.title || "Job"}</h1>
        <span className={clsx("px-3 py-1 rounded text-sm font-semibold w-fit", {
          "bg-green-700": getStatus() === "closed",
          "bg-zinc-700": getStatus() === "open",
        })}>
          Status: {getStatus()}
        </span>
      </header>
      <form onSubmit={handleScan} className="mb-4 flex gap-2">
        <input
          ref={inputRef}
          className="px-4 py-3 rounded bg-zinc-800 border border-zinc-700 text-xl"
          placeholder="Scan or enter barcode..."
          value={barcode}
          onChange={e => setBarcode(e.target.value)}
          autoFocus
        />
        <button type="submit" className="bg-amber-500 text-black px-6 py-3 rounded font-bold">Scan</button>
      </form>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-zinc-800 rounded-lg">
          <thead>
            <tr className="text-left text-gray-400">
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2">Expected</th>
              <th className="px-4 py-2">Returned</th>
              <th className="px-4 py-2">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {items?.map(item => {
              const remaining = item.expected - item.returned;
              return (
                <tr
                  key={item.id}
                  className={clsx("transition-colors", {
                    "bg-green-900": flashRow && flashRow.id === item.id && flashRow.color === "green",
                    "bg-red-900": flashRow && flashRow.id === item.id && flashRow.color === "red",
                  })}
                >
                  <td className="px-4 py-2 font-mono">{item.name}</td>
                  <td className="px-4 py-2">{item.expected}</td>
                  <td className="px-4 py-2">{item.returned}</td>
                  <td className={clsx("px-4 py-2", { "text-red-400": remaining > 0 })}>{remaining}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        className={clsx("mt-8 px-6 py-3 rounded font-bold text-lg", {
          "bg-green-600 text-white": getStatus() === "closed",
          "bg-gray-600 text-gray-300": getStatus() !== "closed",
        })}
        disabled={getStatus() !== "closed"}
        onClick={closeManifest}
      >
        Close Manifest
      </button>
    </main>
  );
}
