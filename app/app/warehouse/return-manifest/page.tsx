"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";
import { Scan, Save, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";

type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];

interface ReturnItem extends InventoryItem {
  return_qty: number;
}

export default function ReturnManifest() {
  const [returnedItems, setReturnedItems] = useState<ReturnItem[]>([]);
  const [barcode, setBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

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
    if (returnedItems.length === 0) {
      setMessage({ type: "error", text: "No items to save" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
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
            note: `General warehouse return`,
          }]);
      }

      setMessage({ type: "success", text: `Saved ${returnedItems.length} items to inventory` });
      setReturnedItems([]);
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
    <DashboardLayout>
    <main className="min-h-screen bg-[#0c0d10] px-6 py-10 text-white">
      <h1 className="text-3xl font-bold mb-8">Return Manifest</h1>

      {/* Barcode Scanner */}
      <form onSubmit={handleScanBarcode} className="mb-6 bg-[#181a20] p-4 rounded-lg border border-white/10">
        <label className="block text-sm font-medium mb-2">Scan Barcode to Return</label>
        <div className="flex gap-2">
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Scan or enter barcode..."
            className="flex-1 px-4 py-2 bg-[#0c0d10] border border-white/10 rounded text-white"
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
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#181a20] mb-6">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-semibold">Scanned Items ({returnedItems.length})</h2>
          {returnedItems.length > 0 && (
            <button
              onClick={handleSaveManifest}
              disabled={saving}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:bg-zinc-700 text-[#0c0d10] font-semibold rounded flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save Manifest"}
            </button>
          )}
        </div>
        {returnedItems.length === 0 ? (
          <div className="p-8 text-center text-white/40">
            No items scanned yet. Scan barcodes to add items to the return manifest.
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-[#23242a]">
              <tr className="text-left text-white/70 text-sm">
                <th className="px-4 py-3">Barcode</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 text-center">Return Qty</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {returnedItems.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-mono text-sm text-amber-200">{item.barcode}</td>
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      min="1"
                      value={item.return_qty}
                      onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                      className="w-20 px-2 py-1 bg-[#0c0d10] border border-white/10 rounded text-center text-white"
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
    </main>
    </DashboardLayout>
  );
}
