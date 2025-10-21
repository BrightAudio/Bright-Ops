export const dynamic = 'force-dynamic';
"use client";
import { useEffect, useRef, useState } from "react";
import { supabase, Tables, TablesUpdate } from "@/lib/supabaseClient";

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
import { useParams } from "next/navigation";
import clsx from "clsx";



export default function PrepSheetPackOut() {
  const { id } = useParams();
  const [job, setJob] = useState<Tables<"jobs"> | null>(null);
  const [prepSheet, setPrepSheet] = useState<Tables<"prep_sheets"> | null>(null);
  const [items, setItems] = useState<Array<Tables<"prep_sheet_items"> & { barcode: string; name: string }> | null>(null);
  const [barcode, setBarcode] = useState("");
  const [flashRow, setFlashRow] = useState<{ id: string; color: "green" | "red" } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
    (async () => {
      setLoading(true);
      // Fetch job, prep sheet, and items
      const { data: jobData } = await supabase.from("jobs").select("*").eq("id", id).single();
      setJob(jobData);
      const { data: sheetData } = await supabase.from("prep_sheets").select("*").eq("job_id", id).single();
      setPrepSheet(sheetData);
      const { data: itemData } = await supabase
        .from("prep_sheet_items")
        .select("*, inventory:inventory_id(barcode, name)")
        .eq("prep_sheet_id", sheetData?.id);
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
    if (!items) return "draft";
  const allPacked = items.every(i => i.picked_qty >= i.required_qty);
  if (allPacked) return "packed";
  const anyPacked = items.some(i => i.picked_qty > 0);
    return anyPacked ? "partial" : "draft";
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
  const remaining = item.required_qty - item.picked_qty;
    if (remaining <= 0) {
      playSound("error");
  setFlashRow({ id: item.id, color: "red" }); // id is string, update usages if needed
      setTimeout(() => setFlashRow(null), 600);
      setBarcode("");
      return;
    }
    // Optimistic UI
    const newItems = [...items];
  newItems[idx] = { ...item, picked_qty: item.picked_qty + 1 };
    setItems(newItems);
    playSound("success");
    setFlashRow({ id: item.id, color: "green" });
    setTimeout(() => setFlashRow(null), 600);
    setBarcode("");
    // Persist
    await supabase
      .from("prep_sheet_items")
  .update({ picked_qty: item.picked_qty + 1 })
      .eq("id", item.id);
  }

  async function markReady() {
    if (!prepSheet || !items) return;
  const allPacked = items.every(i => i.picked_qty >= i.required_qty);
    if (!allPacked) return;
    setPrepSheet({ ...prepSheet, status: "ready" });
    await supabase
      .from("prep_sheets")
  .update({ status: "ready" })
      .eq("id", prepSheet.id);
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-gray-100 p-6">
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Pack Out: {job?.code || job?.title || "Job"}</h1>
        <span className={clsx("px-3 py-1 rounded text-sm font-semibold w-fit", {
          "bg-green-700": getStatus() === "packed",
          "bg-yellow-700": getStatus() === "partial",
          "bg-zinc-700": getStatus() === "draft",
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
              <th className="px-4 py-2">Required</th>
              <th className="px-4 py-2">Packed</th>
              <th className="px-4 py-2">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {items?.map(item => {
              const remaining = item.required_qty - item.packed_qty;
              return (
                <tr
                  key={item.id}
                  className={clsx("transition-colors", {
                    "bg-green-900": flashRow && flashRow.id === item.id && flashRow.color === "green",
                    "bg-red-900": flashRow && flashRow.id === item.id && flashRow.color === "red",
                  })}
                >
                  <td className="px-4 py-2 font-mono">{item.name}</td>
                  <td className="px-4 py-2">{item.required_qty}</td>
                  <td className="px-4 py-2">{item.packed_qty}</td>
                  <td className={clsx("px-4 py-2", { "text-red-400": remaining > 0 })}>{remaining}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        className={clsx("mt-8 px-6 py-3 rounded font-bold text-lg", {
          "bg-green-600 text-white": getStatus() === "packed",
          "bg-gray-600 text-gray-300": getStatus() !== "packed",
        })}
        disabled={getStatus() !== "packed"}
        onClick={markReady}
      >
        Mark Ready
      </button>
    </main>
  );
}
