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
  
  // CSV Upload
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<string | null>(null);
  
  // Manual Add
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

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

  async function handleCSVUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResults(null);
    setError(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header if exists
      const startIndex = lines[0].toLowerCase().includes('barcode') ? 1 : 0;
      const barcodes = lines.slice(startIndex).map(line => {
        // Handle CSV with commas or just plain list
        const parts = line.split(',');
        return parts[0].trim();
      }).filter(b => b);

      const { supabase } = await import("@/lib/supabaseClient");
      
      // Get job and pull sheet
      const { data: job } = await supabase
        .from("jobs")
        .select("id")
        .eq("code", jobCode)
        .maybeSingle();
      
      if (!job) throw new Error(`Job ${jobCode} not found`);
      
      let { data: pullSheet } = await supabase
        .from("pull_sheets")
        .select("id")
        .eq("job_id", (job as any).id)
        .maybeSingle();
      
      if (!pullSheet) {
        const { data: newPs } = await supabase
          .from("pull_sheets")
          .insert({
            job_id: (job as any).id,
            name: `Pull Sheet for ${jobCode}`,
            status: "pending"
          } as never)
          .select()
          .single();
        pullSheet = newPs;
      }

      let added = 0;
      let updated = 0;
      let notFound = 0;

      for (const barcode of barcodes) {
        const { data: inventoryItem } = await supabase
          .from("inventory_items")
          .select("id, name, barcode, category")
          .eq("barcode", barcode)
          .maybeSingle();
        
        if (!inventoryItem) {
          notFound++;
          continue;
        }

        const { data: existingItem } = await supabase
          .from("pull_sheet_items")
          .select("id, qty_requested")
          .eq("pull_sheet_id", (pullSheet as any).id)
          .eq("inventory_item_id", (inventoryItem as any).id)
          .maybeSingle();
        
        if (existingItem) {
          await supabase
            .from("pull_sheet_items")
            .update({
              qty_requested: (existingItem as any).qty_requested + 1
            } as never)
            .eq("id", (existingItem as any).id);
          updated++;
        } else {
          await supabase
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
          added++;
        }
      }

      setUploadResults(`✅ CSV Upload Complete!\nAdded: ${added} new items\nUpdated: ${updated} existing items\nNot found: ${notFound}`);
      playSafe(okBeep);
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV upload failed");
      playSafe(errBeep);
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset file input
    }
  }

  async function searchInventory() {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, barcode, category")
        .or(`name.ilike.%${searchQuery}%,barcode.ilike.%${searchQuery}%`)
        .limit(20);
      
      if (error) throw error;
      setSearchResults(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function addManualItem(item: any) {
    setLoading(true);
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      const { data: job } = await supabase
        .from("jobs")
        .select("id")
        .eq("code", jobCode)
        .maybeSingle();
      
      if (!job) throw new Error(`Job ${jobCode} not found`);
      
      let { data: pullSheet } = await supabase
        .from("pull_sheets")
        .select("id")
        .eq("job_id", (job as any).id)
        .maybeSingle();
      
      if (!pullSheet) {
        const { data: newPs } = await supabase
          .from("pull_sheets")
          .insert({
            job_id: (job as any).id,
            name: `Pull Sheet for ${jobCode}`,
            status: "pending"
          } as never)
          .select()
          .single();
        pullSheet = newPs;
      }

      const { data: existingItem } = await supabase
        .from("pull_sheet_items")
        .select("id, qty_requested")
        .eq("pull_sheet_id", (pullSheet as any).id)
        .eq("inventory_item_id", item.id)
        .maybeSingle();
      
      if (existingItem) {
        await supabase
          .from("pull_sheet_items")
          .update({
            qty_requested: (existingItem as any).qty_requested + 1
          } as never)
          .eq("id", (existingItem as any).id);
        setMsg(`✅ Added +1 ${item.name} (Total: ${(existingItem as any).qty_requested + 1})`);
      } else {
        await supabase
          .from("pull_sheet_items")
          .insert({
            pull_sheet_id: (pullSheet as any).id,
            inventory_item_id: item.id,
            item_name: item.name,
            barcode: item.barcode,
            category: item.category,
            qty_requested: 1,
            qty_pulled: 0,
            qty_fulfilled: 0,
            prep_status: "pending"
          } as never);
        setMsg(`✅ Added ${item.name} to pull sheet`);
      }
      
      playSafe(okBeep);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add item");
      playSafe(errBeep);
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

      {/* CSV Upload Section */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold mb-2">Bulk Upload</h3>
        <p className="text-sm text-gray-600 mb-3">Upload a CSV file with barcodes (one per line or comma-separated)</p>
        <input
          type="file"
          accept=".csv,.txt"
          onChange={handleCSVUpload}
          disabled={uploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
        {uploading && <div className="mt-2 text-sm text-blue-600">Uploading...</div>}
        {uploadResults && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700 whitespace-pre-line">
            {uploadResults}
          </div>
        )}
      </div>

      {/* Manual Add Section */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold mb-2">Manual Add</h3>
        <p className="text-sm text-gray-600 mb-3">Search and add items from warehouse inventory</p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            className="flex-1 border rounded px-3 py-2 text-sm"
            placeholder="Search by name or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") searchInventory(); }}
          />
          <button
            onClick={searchInventory}
            disabled={searching}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </div>
        
        {searchResults.length > 0 && (
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded">
            {searchResults.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 hover:bg-gray-100 border-b last:border-b-0"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-gray-500">
                    {item.barcode} {item.category && `• ${item.category}`}
                  </div>
                </div>
                <button
                  onClick={() => addManualItem(item)}
                  disabled={loading}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {msg && <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-700">{msg}</div>}
      {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">❌ {error}</div>}
    </div>
  );
}
