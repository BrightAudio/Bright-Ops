"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const BarcodeScanner = dynamic(
  () => import("./BarcodeScanner").then((m) => m.default),
  { ssr: false, loading: () => <div>Starting camera…</div> }
);
// Use success.mp3 for success and fail.mp3 for failure
const okBeep = typeof Audio !== "undefined" ? new Audio("/success.mp3") : null;
const errBeep = typeof Audio !== "undefined" ? new Audio("/fail.mp3") : null;

const playSafe = (a: HTMLAudioElement | null) => {
  try {
    if (a && a.currentTime) {
      a.currentTime = 0;
    }
    a?.play()?.catch(() => {});
  } catch {
    // Ignore audio errors
  }
};

export default function ScanConsole() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastHandledRef = useRef<{ code: string; ts: number } | null>(null);
  const [jobCode, setJobCode] = useState<string>("JOB-1001");
  const [code, setCode] = useState<string>("VRX932-001");
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleViewPullSheet() {
    try {
      // Fetch pull sheet ID by job code
      const res = await fetch(`/api/pullsheet?jobCode=${encodeURIComponent(jobCode)}&idOnly=true`);
      const data = await res.json();
      
      if (data.pullSheetId) {
        // Open the professional pull sheet viewer
        window.open(`/app/warehouse/pull-sheets/${data.pullSheetId}`, "_blank");
      } else {
        setError("No pull sheet found for this job");
      }
    } catch (e) {
      setError("Failed to load pull sheet");
    }
  }

  async function send() {
    const codeToSend = code?.trim();
    if (!codeToSend) return;
    const now = Date.now();
    if (lastHandledRef.current?.code === codeToSend && now - lastHandledRef.current.ts < 1500) {
      return;
    }
    lastHandledRef.current = { code: codeToSend, ts: now };
    setLoading(true); setMsg(null); setError(null);
    
    try {
      // Import supabase dynamically
      const { supabase } = await import("@/lib/supabaseClient");
      
      // 1. Find the job by code
      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .select("id")
        .eq("code", jobCode)
        .maybeSingle();
      
      if (jobError || !job) {
        playSafe(errBeep);
        throw new Error(`Job ${jobCode} not found`);
      }
      
      // 2. Find or create pull sheet for this job
      let { data: pullSheet, error: psError } = await supabase
        .from("pull_sheets")
        .select("id, name")
        .eq("job_id", (job as any).id)
        .maybeSingle();
      
      if (psError && psError.code !== 'PGRST116') { // PGRST116 = no rows
        throw psError;
      }
      
      // Create pull sheet if it doesn't exist
      if (!pullSheet) {
        const { data: newPs, error: createError } = await supabase
          .from("pull_sheets")
          .insert({
            job_id: (job as any).id,
            name: `Pull Sheet for ${jobCode}`,
            status: "pending"
          } as never)
          .select()
          .single();
        
        if (createError) throw createError;
        pullSheet = newPs as any;
      }
      
      // 3. Find inventory item by barcode
      const { data: inventoryItem, error: invError } = await supabase
        .from("inventory_items")
        .select("id, name, barcode, category")
        .eq("barcode", codeToSend)
        .maybeSingle();
      
      if (invError || !inventoryItem) {
        playSafe(errBeep);
        throw new Error(`Barcode ${codeToSend} not found in inventory`);
      }
      
      // 4. Check if item already exists on pull sheet
      const { data: existingItem, error: checkError } = await supabase
        .from("pull_sheet_items")
        .select("id, item_name, qty_requested")
        .eq("pull_sheet_id", (pullSheet as any).id)
        .eq("inventory_item_id", (inventoryItem as any).id)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existingItem) {
        // Item already on pull sheet - increment quantity
        const { error: updateError } = await supabase
          .from("pull_sheet_items")
          .update({
            qty_requested: (existingItem as any).qty_requested + 1
          } as never)
          .eq("id", (existingItem as any).id);
        
        if (updateError) throw updateError;
        
        playSafe(okBeep);
        setMsg(`✅ Added +1 ${(inventoryItem as any).name} (Total: ${(existingItem as any).qty_requested + 1})`);
      } else {
        // Add new item to pull sheet
        const { error: insertError } = await supabase
          .from("pull_sheet_items")
          .insert({
            pull_sheet_id: (pullSheet as any).id,
            inventory_item_id: (inventoryItem as any).id,
            item_name: (inventoryItem as any).name,
            barcode: (inventoryItem as any).barcode,
            category: (inventoryItem as any).category,
            qty_requested: 1,
            qty_pulled: 0,
            qty_fulfilled: 0,
            prep_status: "pending"
          } as never);
        
        if (insertError) throw insertError;
        
        playSafe(okBeep);
        setMsg(`✅ Added ${(inventoryItem as any).name} to pull sheet (0/1)`);
      }
      
      setCode("");
      inputRef.current?.focus();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded border hover:bg-gray-100"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold">Build Pull Sheet</h1>
      </div>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Scan barcodes to add items to the pull sheet.</strong><br />
          Each scan adds the item as "0/1" (requested but not fulfilled).<br />
          Then use the pull sheet viewer to scan and fulfill items.
        </p>
      </div>
      
      <label className="block text-sm font-medium mb-1">Job Code</label>
      <input
        className="w-full border rounded px-3 py-2 mb-4"
        value={jobCode}
        onChange={(e) => setJobCode(e.target.value)}
        placeholder="JOB-1001"
      />
      <div className="mb-4">
        <BarcodeScanner onResult={(value) => setCode(value)} />
      </div>
      <label className="block text-sm font-medium mb-1">Serial / Barcode</label>
      <input
        ref={inputRef}
        className="w-full border rounded px-3 py-2 mb-4"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Scan or type a barcode"
        onKeyDown={(e) => { if (e.key === "Enter" && !loading) send(); }}
        autoFocus
      />
      
      <div className="flex gap-2 mb-4">
        <button
          className="flex-1 px-4 py-3 rounded bg-blue-600 text-white font-semibold disabled:opacity-50 hover:bg-blue-700"
          onClick={async () => {
            try {
              await Promise.all([
                okBeep?.load?.() || Promise.resolve(),
                errBeep?.load?.() || Promise.resolve()
              ]);
            } catch {}
            await send();
          }}
          disabled={loading}
        >
          {loading ? "Adding..." : "Add to Pull Sheet"}
        </button>
        <button
          className="px-4 py-3 rounded border border-gray-300 hover:bg-gray-50 font-semibold"
          onClick={handleViewPullSheet}
        >
          View Pull Sheet
        </button>
      </div>
      
      {msg && <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-700">{msg}</div>}
      {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">❌ {error}</div>}
    </div>
  );
}
