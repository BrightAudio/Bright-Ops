"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, CheckCircle } from "lucide-react";

type InventoryItem = {
  id: string;
  barcode: string | null;
  name: string;
  category: string | null;
  quantity_on_hand: number | null;
  qty_in_warehouse: number | null;
};

type ReturnItem = InventoryItem & {
  return_qty: number;
};

type Job = {
  id: string;
  code: string;
  title: string;
  expected_return_date: string | null;
};

type ReturnManifest = {
  id: string;
  job_id: string;
  status: string;
  created_at: string;
};

type ProfessionalReturnManifestProps = {
  jobId: string;
  job?: Job;
};

// Category order matching pull sheets
const CATEGORY_ORDER = [
  'Audio',
  'Lighting', 
  'Video',
  'Stage',
  'Pipe and Drape',
  'Edison',
  'Misc',
  'Other'
];

export default function ProfessionalReturnManifest({ jobId, job }: ProfessionalReturnManifestProps) {
  const router = useRouter();
  const [manifest, setManifest] = useState<ReturnManifest | null>(null);
  const [returnedItems, setReturnedItems] = useState<ReturnItem[]>([]);
  const [barcode, setBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadManifest();
  }, [jobId]);

  async function loadManifest() {
    const { data: existingManifest } = await supabase
      .from("return_manifest")
      .select("*")
      .eq("job_id", jobId)
      .single();

    if (existingManifest) {
      setManifest(existingManifest);
    } else {
      const { data: newManifest } = await supabase
        .from("return_manifest")
        .insert([{ job_id: jobId, status: "open" }] as any)
        .select()
        .single();
      setManifest(newManifest);
    }
  }

  async function handleScanBarcode(e: React.FormEvent) {
    e.preventDefault();
    if (!barcode.trim()) return;

    setScanning(true);
    setMessage(null);

    try {
      const { data: item, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("barcode", barcode.trim())
        .single();

      if (error || !item) {
        setMessage({ type: "error", text: `Item not found: ${barcode}` });
        playBeep("error");
        setBarcode("");
        return;
      }

      const existingIndex = returnedItems.findIndex((ri) => ri.id === item.id);
      
      if (existingIndex >= 0) {
        const updated = [...returnedItems];
        updated[existingIndex].return_qty += 1;
        setReturnedItems(updated);
        setMessage({ type: "success", text: `Added another ${item.name} (Total: ${updated[existingIndex].return_qty})` });
      } else {
        setReturnedItems([...returnedItems, { ...(item as any), return_qty: 1 }]);
        setMessage({ type: "success", text: `Scanned: ${item.name}` });
      }

      playBeep("success");
      setBarcode("");
      barcodeInputRef.current?.focus();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Scan failed" });
      playBeep("error");
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
      await supabase
        .from("return_manifest")
        .update({ status: "complete" } as any)
        .eq("id", manifest.id);

      await supabase
        .from("jobs")
        .update({ status: "returned" } as any)
        .eq("id", jobId);

      for (const item of returnedItems) {
        await supabase
          .from("inventory_items")
          .update({ 
            quantity_on_hand: (item.quantity_on_hand ?? 0) + item.return_qty,
            qty_in_warehouse: (item.qty_in_warehouse ?? 0) + item.return_qty
          } as any)
          .eq("id", item.id);

        await supabase
          .from("inventory_movements")
          .insert([{
            item_id: item.id,
            movement_type: "return",
            quantity: item.return_qty,
            from_location: `Job ${jobId}`,
            to_location: "Warehouse",
            notes: `Returned from job ${jobId}`,
          }] as any);
      }

      setMessage({ type: "success", text: `✓ Returned ${returnedItems.length} items to warehouse` });
      playBeep("success");
      setReturnedItems([]);
      loadManifest();
      
      // Redirect after 2 seconds
      setTimeout(() => router.push("/app/warehouse/returns"), 2000);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
      playBeep("error");
    } finally {
      setSaving(false);
    }
  }

  function playBeep(type: "success" | "error") {
    const audio = new Audio(type === "success" ? "/beep-success.mp3" : "/beep-error.mp3");
    audio.play().catch(() => {});
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

  // Group items by category
  const itemsByCategory = returnedItems.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ReturnItem[]>);

  const categoriesToDisplay = CATEGORY_ORDER.filter(cat => itemsByCategory[cat]);
  const customCategories = Object.keys(itemsByCategory)
    .filter(cat => !CATEGORY_ORDER.includes(cat))
    .sort();
  const allCategories = [...categoriesToDisplay, ...customCategories];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation & Scanner */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
              <span>Back to Returns</span>
            </button>
            {returnedItems.length > 0 && (
              <button
                onClick={handleSaveManifest}
                disabled={saving}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50 font-semibold"
              >
                <Save size={18} />
                {saving ? "Saving..." : `Save Return (${returnedItems.length} items)`}
              </button>
            )}
          </div>

          {/* Barcode Scanner */}
          <form onSubmit={handleScanBarcode} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Scan Barcode to Return Item
            </label>
            <div className="flex gap-2">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or enter barcode..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={scanning}
                autoFocus
              />
              <button
                type="submit"
                disabled={scanning || !barcode.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded font-semibold"
              >
                {scanning ? "Scanning..." : "Scan"}
              </button>
            </div>
          </form>

          {/* Message Display */}
          {message && (
            <div
              className={`mt-3 p-3 rounded flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.type === "success" && <CheckCircle size={18} />}
              {message.text}
            </div>
          )}
        </div>
      </div>

      {/* Return Manifest Sheet */}
      <div className="max-w-7xl mx-auto p-8 bg-white my-6 shadow-lg">
        {/* Header Section */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">RETURN MANIFEST</h1>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold">Job Code: <span className="text-red-600">{job?.code || jobId}</span></div>
              <div className="text-lg font-semibold mt-1">{job?.title || "Loading..."}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Return Date: {new Date().toLocaleDateString()}</div>
              <div className={`inline-block px-3 py-1 rounded text-xs font-semibold mt-1 ${
                manifest?.status === 'complete' ? 'bg-green-100 text-green-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {manifest?.status?.toUpperCase() || 'OPEN'}
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        {returnedItems.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-xl font-semibold">No items scanned yet</p>
            <p className="text-sm mt-2">Scan barcodes above to add items to the return manifest</p>
          </div>
        ) : (
          <div className="space-y-6">
            {allCategories.map((category) => {
              const categoryItems = itemsByCategory[category] || [];
              if (categoryItems.length === 0) return null;

              return (
                <div key={category} className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-gray-800 text-white px-4 py-2 font-bold text-sm">
                    {category.toUpperCase()}
                  </div>
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b border-gray-300">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold">Barcode</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold">Item Name</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold w-32">Return Qty</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryItems.map((item, idx) => (
                        <tr 
                          key={item.id} 
                          className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        >
                          <td className="px-4 py-3 font-mono text-sm text-gray-600">{item.barcode || '—'}</td>
                          <td className="px-4 py-3 font-medium">{item.name}</td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.return_qty}
                              onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-center font-semibold"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Remove item"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}

            {/* Summary */}
            <div className="border-t-2 border-gray-800 pt-4 mt-6">
              <div className="flex justify-between items-center">
                <div className="text-gray-600">
                  <div className="text-sm">Total Categories: {allCategories.length}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    Total Items: {returnedItems.reduce((sum, item) => sum + item.return_qty, 0)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {returnedItems.length} unique item{returnedItems.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
