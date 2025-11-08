"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";
import { Scan, Save, Trash2 } from "lucide-react";

type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
type ReturnManifest = Database["public"]["Tables"]["return_manifest"]["Row"];

interface ReturnItem extends InventoryItem {
  return_qty: number;
}

export default function ReturnManifestClient({ jobId }: { jobId: string }) {
  const [manifest, setManifest] = useState<ReturnManifest | null>(null);
  const [returnedItems, setReturnedItems] = useState<ReturnItem[]>([]);
  const [barcode, setBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const loadManifest = useCallback(async () => {
    // Load or create return manifest
    const { data: existingManifest } = await supabase
      .from("return_manifest")
      .select("*")
      .eq("job_id", jobId)
      .single();

    if (existingManifest) {
      setManifest(existingManifest);
      // TODO: Load returned items from a return_items table if it exists
      // For now, we'll track items in state only
    } else {
      // Create new manifest
      const { data: newManifest } = await supabase
        .from("return_manifest")
        .insert([{ job_id: jobId, status: "open" }])
        .select()
        .single();
      setManifest(newManifest);
    }
  }, [jobId]);

  // Load manifest and items on mount
  useEffect(() => {
    loadManifest();
  }, [loadManifest]);

  async function handleScanBarcode(e: React.FormEvent) {
    e.preventDefault();
    if (!barcode.trim()) return;

    setScanning(true);
    setMessage(null);

    try {
      // Look up item by barcode
      const { data: item, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("barcode", barcode.trim())
        .single();

      if (error || !item) {
        setMessage({ type: "error", text: `Item not found: ${barcode}` });
        setBarcode("");
        return;
      }

      // Check if item already in list
      const existingIndex = returnedItems.findIndex((ri) => ri.id === item.id);
      
      if (existingIndex >= 0) {
        // Increment quantity
        const updated = [...returnedItems];
        updated[existingIndex].return_qty += 1;
        setReturnedItems(updated);
        setMessage({ type: "success", text: `Added another ${item.name} (Total: ${updated[existingIndex].return_qty})` });
      } else {
        // Add new item
        setReturnedItems([...returnedItems, { ...item, return_qty: 1 }]);
        setMessage({ type: "success", text: `Scanned: ${item.name}` });
      }

      setBarcode("");
      barcodeInputRef.current?.focus();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Scan failed" });
    } finally {
      setScanning(false);
    }
  }

  async function handleSaveManifest() {
    if (!manifest || returnedItems.length === 0) {
      setMessage({ type: "error", text: "No items to save" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Update manifest status to complete
      await supabase
        .from("return_manifest")
        .update({ status: "complete" })
        .eq("id", manifest.id);

      // Update inventory quantities for returned items
      for (const item of returnedItems) {
        await supabase
          .from("inventory_items")
          .update({ 
            quantity_on_hand: (item.quantity_on_hand ?? 0) + item.return_qty 
          })
          .eq("id", item.id);

        // Record movement
        await supabase
          .from("inventory_movements")
          .insert([{
            item_id: item.id,
            qty: item.return_qty,
            direction: "in",
            note: `Returned from job ${jobId}`,
          }]);
      }

      setMessage({ type: "success", text: `Saved ${returnedItems.length} items to manifest` });
      setReturnedItems([]);
  loadManifest();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  function removeItem(itemId: string) {
    setReturnedItems(returnedItems.filter((item) => item.id !== itemId));
  }

  function updateQuantity(itemId: string, newQty: number) {
    if (newQty <= 0) {
      removeItem(itemId);
      return;
    }
    setReturnedItems(
      returnedItems.map((item) =>
        item.id === itemId ? { ...item, return_qty: newQty } : item
      )
    );
  }

  return (
    <div className="p-6 bg-zinc-900 min-h-screen text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Return Manifest</h1>
          <div className="text-sm text-zinc-400">
            Job ID: {jobId} | Status: {manifest?.status || "Loading..."}
          </div>
        </div>

        {/* Barcode Scanner */}
        <form onSubmit={handleScanBarcode} className="mb-6 bg-zinc-800 p-4 rounded-lg">
          <label className="block text-sm font-medium mb-2">Scan Barcode to Return</label>
          <div className="flex gap-2">
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scan or enter barcode..."
              className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-white"
              disabled={scanning}
              autoFocus
            />
            <button
              type="submit"
              disabled={scanning || !barcode.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 rounded flex items-center gap-2"
            >
              <Scan size={18} />
              {scanning ? "Scanning..." : "Scan"}
            </button>
          </div>
        </form>

        {/* Message Display */}
        {message && (
          <div
            className={`mb-4 p-3 rounded ${
              message.type === "success"
                ? "bg-green-900 text-green-200"
                : "bg-red-900 text-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Returned Items List */}
        <div className="bg-zinc-800 rounded-lg overflow-hidden mb-6">
          <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
            <h2 className="font-semibold">Scanned Items ({returnedItems.length})</h2>
            {returnedItems.length > 0 && (
              <button
                onClick={handleSaveManifest}
                disabled={saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 rounded flex items-center gap-2"
              >
                <Save size={18} />
                {saving ? "Saving..." : "Save Manifest"}
              </button>
            )}
          </div>
          {returnedItems.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              No items scanned yet. Scan barcodes to add items to the return manifest.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-zinc-700">
                <tr>
                  <th className="px-4 py-2 text-left">Barcode</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-center">Return Qty</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {returnedItems.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-700">
                    <td className="px-4 py-3 font-mono text-sm">{item.barcode}</td>
                    <td className="px-4 py-3">{item.name}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.return_qty}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-20 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-center"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Remove item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
