"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useRigContainer, updateRigContainer, addItemToRig, updateRigItem, removeItemFromRig } from "@/lib/hooks/useRigContainers";
import { useInventory } from "@/lib/hooks/useInventory";
import { supabase } from "@/lib/supabaseClient";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PrintBarcodeButton from "@/components/PrintBarcodeButton";
import { Package, Plus, Trash2, Search } from "lucide-react";

export default function RigDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : undefined;
  
  const { data: rig, loading, error, reload } = useRigContainer(id);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "" });
  const [saving, setSaving] = useState(false);
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  // Initialize barcode rendering
  useEffect(() => {
    if (typeof window !== 'undefined' && rig?.barcode) {
      import('jsbarcode').then((JsBarcode) => {
        const barcodeElements = document.querySelectorAll('.barcode');
        barcodeElements.forEach((element) => {
          JsBarcode.default(element as any, rig.barcode!, {
            format: 'CODE128',
            width: 2,
            height: 60,
            displayValue: true,
            fontOptions: 'bold',
            fontSize: 14,
          });
        });
      });
    }
  }, [rig?.barcode]);

  useEffect(() => {
    if (rig) {
      setForm({
        name: rig.name || "",
        description: rig.description || "",
        category: rig.category || "",
      });
    }
  }, [rig]);

  useEffect(() => {
    const searchInventory = async () => {
      if (!search.trim()) {
        setSearchResults([]);
        return;
      }
      
      const { data } = await supabase
        .from("inventory_items")
        .select("id, name, barcode, image_url")
        .or(`name.ilike.%${search}%,barcode.ilike.%${search}%`)
        .limit(10);
      
      setSearchResults(data || []);
    };
    
    const timer = setTimeout(searchInventory, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function handleUpdate() {
    if (!id) return;
    setSaving(true);
    try {
      await updateRigContainer(id, {
        name: form.name,
        description: form.description,
        category: form.category,
      });
      setEditMode(false);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update rig");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddItem() {
    if (!id || !selectedItem) return;
    
    try {
      await addItemToRig({
        rig_container_id: id,
        inventory_item_id: selectedItem.id,
        quantity,
        notes,
      });
      setAddItemModalOpen(false);
      setSelectedItem(null);
      setSearch("");
      setQuantity(1);
      setNotes("");
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add item");
    }
  }

  async function handleRemoveItem(itemId: string) {
    if (!confirm("Remove this item from the rig?")) return;
    
    try {
      await removeItemFromRig(itemId);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove item");
    }
  }

  async function handleUpdateQuantity(itemId: string, newQty: number) {
    try {
      await updateRigItem(itemId, { quantity: newQty });
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update quantity");
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p className="p-6 text-zinc-400">Loading...</p>
      </DashboardLayout>
    );
  }

  if (error || !rig) {
    return (
      <DashboardLayout>
        <p className="p-6 text-red-500">{String(error) || "Rig not found"}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="p-6">
        <div className="mb-6">
          <button
            onClick={() => router.push("/app/inventory/rigs")}
            className="text-zinc-400 hover:text-white mb-4 flex items-center gap-2"
          >
            ← Back to Rigs
          </button>
          
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {editMode ? (
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="text-3xl font-bold bg-zinc-800 border border-zinc-700 rounded px-3 py-1 text-white mb-2"
                />
              ) : (
                <h1 className="text-3xl font-bold text-white mb-2">{rig.name}</h1>
              )}
              {editMode ? (
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-300"
                  rows={2}
                />
              ) : (
                rig.description && <p className="text-zinc-400">{rig.description}</p>
              )}
            </div>
            
            {/* Barcode Display */}
            {rig.barcode && (
              <div className="ml-4 flex flex-col items-end gap-2">
                <div className="bg-white p-3 rounded-lg shadow-lg">
                  <div className="text-center mb-1">
                    <svg
                      className="barcode"
                      jsbarcode-value={rig.barcode}
                      jsbarcode-format="CODE128"
                      jsbarcode-width="2"
                      jsbarcode-height="60"
                      jsbarcode-displayvalue="true"
                      jsbarcode-fontoptions="bold"
                      jsbarcode-fontsize="14"
                    />
                  </div>
                </div>
                <PrintBarcodeButton barcode={rig.barcode} itemName={rig.name} />
              </div>
            )}
            
            <div className="flex gap-2 ml-4">
              {editMode ? (
                <>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 border border-zinc-600 text-zinc-200 rounded-md hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-zinc-700 text-white rounded-md hover:bg-zinc-600"
                >
                  Edit Details
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Equipment in this Rig</h2>
            <button
              onClick={() => setAddItemModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
            >
              <Plus size={18} />
              Add Item
            </button>
          </div>

          {(!rig.items || rig.items.length === 0) ? (
            <div className="text-center py-8 text-zinc-500">
              <Package size={48} className="mx-auto mb-3 text-zinc-600" />
              <p>No items in this rig yet</p>
              <p className="text-sm">Click "Add Item" to get started</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700 text-left text-sm text-zinc-400">
                  <th className="pb-2">Item</th>
                  <th className="pb-2">Barcode</th>
                  <th className="pb-2 text-right">Quantity</th>
                  <th className="pb-2">Notes</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rig.items.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-800">
                    <td className="py-3 text-white">
                      {item.inventory_items?.name || "Unknown"}
                    </td>
                    <td className="py-3 text-zinc-400">
                      {item.inventory_items?.barcode || "-"}
                    </td>
                    <td className="py-3 text-right">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleUpdateQuantity(item.id, Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-white text-right"
                      />
                    </td>
                    <td className="py-3 text-zinc-400 text-sm">
                      {item.notes || "-"}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-zinc-700 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add Item Modal */}
        {addItemModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-white mb-4">Add Item to Rig</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-200 mb-2">
                  Search Inventory
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or barcode..."
                    className="w-full pl-10 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white"
                  />
                </div>
                
                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto border border-zinc-700 rounded">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => {
                          setSelectedItem(result);
                          setSearch(result.name);
                          setSearchResults([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-zinc-700 text-white text-sm border-b border-zinc-800 last:border-0"
                      >
                        <div className="font-medium">{result.name}</div>
                        <div className="text-xs text-zinc-400">{result.barcode}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-200 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-200 mb-2">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Include stands and cables"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setAddItemModalOpen(false);
                    setSelectedItem(null);
                    setSearch("");
                    setQuantity(1);
                    setNotes("");
                  }}
                  className="px-4 py-2 border border-zinc-600 text-zinc-200 rounded-md hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={!selectedItem}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Rig
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
