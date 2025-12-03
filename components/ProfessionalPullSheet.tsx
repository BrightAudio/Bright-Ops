"use client";
// @ts-nocheck
import React, { useState, useEffect } from "react";
import BarcodeScanner from "@/components/BarcodeScanner";
import GearSubstitutionModal from "@/components/GearSubstitutionModal";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Printer, ArrowLeft, Upload, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Item = {
  id: string;
  inventory_item_id?: string | null;
  item_name?: string;
  qty_requested?: number;
  qty_pulled?: number;
  qty_fulfilled?: number; // New: tracks individual scanned units
  notes?: string | null;
  category?: string | null;
  prep_status?: string | null;
  inventory_items?: { 
    barcode?: string; 
    name?: string; 
    category?: string;
  };
};

type PullSheet = {
  id: string;
  name: string;
  status: string;
  scheduled_out_at: string | null;
  expected_return_at: string | null;
  notes: string | null;
  jobs?: {
    code?: string;
    title?: string;
    client?: string;
  };
};

type ProfessionalPullSheetProps = {
  pullSheet: PullSheet;
  items: Item[];
  onRefresh: () => void;
};

type ScanRecord = {
  id: string;
  pull_sheet_id: string;
  item_id: string;
  item_name: string;
  scanned_at: string;
  qty: number;
};

// Category order matching Mercury format
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

export default function ProfessionalPullSheet({ 
  pullSheet, 
  items, 
  onRefresh 
}: ProfessionalPullSheetProps) {
  const router = useRouter();
  const [substitutionModal, setSubstitutionModal] = useState<{
    open: boolean;
    item: Item | null;
  }>({ open: false, item: null });
  const [showInlineAddItem, setShowInlineAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemCategory, setNewItemCategory] = useState("Audio");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryResults, setInventoryResults] = useState<Item[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<Item | null>(null);

  // Fetch inventory suggestions when searching
  useEffect(() => {
    let active = true;
    (async () => {
      if (!inventorySearch || inventorySearch.trim().length < 2) {
        setInventoryResults([]);
        setInventoryLoading(false);
        return;
      }
      setInventoryLoading(true);
      try {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('id, name, barcode, gear_type, location')
          .or(`name.ilike.%${inventorySearch.trim()}%,barcode.ilike.%${inventorySearch.trim()}%`)
          .order('name', { ascending: true })
          .limit(25);

        if (!active) return;
        if (error) {
          console.error('Inventory search error:', error);
          setInventoryResults([]);
        } else {
          const items = (data || []) as any[];
          setInventoryResults(
            items.map((it) => ({
              id: it.id,
              inventory_items: { name: it.name, barcode: it.barcode, category: it.gear_type },
            }))
          );
        }
      } catch (err) {
        console.error('Inventory search failed:', err);
        setInventoryResults([]);
      } finally {
        setInventoryLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [inventorySearch]);
  const [addingItem, setAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<Item> | null>(null);
  const [committing, setCommitting] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [substitutionModeId, setSubstitutionModeId] = useState<string | null>(null);
  const [showScanHistory, setShowScanHistory] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [loadingScanHistory, setLoadingScanHistory] = useState(false);
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [editingCellValue, setEditingCellValue] = useState<string>("");

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const category = item.category || item.inventory_items?.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, Item[]>);

  // Always show all standard categories, even if empty (Mercury style)
  const allCategories = CATEGORY_ORDER;
  
  // Add any custom categories not in the standard list
  const customCategories = Object.keys(itemsByCategory)
    .filter(cat => !CATEGORY_ORDER.includes(cat))
    .sort();
  
  const categoriesToDisplay = [...allCategories, ...customCategories];

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function handlePrint() {
    window.print();
  }

  async function handleAddItem() {
    if (!newItemName.trim()) return;
    
    setAddingItem(true);
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      const { error } = await supabase
        .from("pull_sheet_items")
        .insert({
          pull_sheet_id: pullSheet.id,
          item_name: newItemName,
          qty_requested: newItemQty,
          qty_pulled: 0,
          qty_fulfilled: 0,
          category: newItemCategory,
          prep_status: "pending"
        } as never);

      if (error) throw error;

      // Also add to scan history so it appears in recently scanned section
      const { error: scanError } = await supabase
        .from("pull_sheet_scans")
        .insert({
          pull_sheet_id: pullSheet.id,
          item_name: newItemName,
          qty: newItemQty,
          scanned_at: new Date().toISOString()
        } as never);

      if (scanError) {
        console.warn("Failed to add to scan history, but item was created:", scanError);
      }

      // Reset form
      setNewItemName("");
      setNewItemQty(1);
      setNewItemCategory("Audio");
      setShowInlineAddItem(false);
      onRefresh();
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Failed to add item");
    } finally {
      setAddingItem(false);
    }
  }

  async function handleEditItem() {
    if (!editingItemId || !editingItem) return;

    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      const { error } = await (supabase as any)
        .from("pull_sheet_items")
        .update({
          item_name: editingItem.item_name,
          qty_requested: editingItem.qty_requested,
          category: editingItem.category,
          notes: editingItem.notes
        })
        .eq("id", editingItemId);

      if (error) throw error;

      setEditingItemId(null);
      setEditingItem(null);
      onRefresh();
    } catch (error) {
      console.error("Error updating item:", error);
      alert("Failed to update item");
    }
  }

  async function saveCellEdit(itemId: string, field: string, value: string) {
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      const updateData: any = {};
      
      if (field === 'qty_requested') {
        updateData.qty_requested = parseInt(value) || 0;
      } else if (field === 'qty_pulled') {
        updateData.qty_pulled = parseInt(value) || 0;
      } else if (field === 'notes') {
        updateData.notes = value || null;
      } else if (field === 'prep_status') {
        updateData.prep_status = value;
      }

      const { error } = await (supabase as any)
        .from("pull_sheet_items")
        .update(updateData)
        .eq("id", itemId);

      if (error) throw error;

      setEditingCellId(null);
      setEditingCellValue("");
      onRefresh();
    } catch (error) {
      console.error("Error saving cell edit:", error);
      alert("Failed to save changes");
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm("Delete this item?")) return;

    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      const { error } = await supabase
        .from("pull_sheet_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item");
    }
  }

  async function handleCommitPullSheet() {
    if (!confirm("Commit this pull sheet? Items will be finalized and sent to pull sheets.")) return;

    setCommitting(true);
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      
      // Filter out empty items (no item_name or qty_requested = 0)
      const filledItems = items.filter(item => 
        item.item_name?.trim() && item.qty_requested && item.qty_requested > 0
      );

      // Update pull sheet status to picking
      const { error: updateError } = await (supabase as any)
        .from("pull_sheets")
        .update({ status: "picking" })
        .eq("id", pullSheet.id);

      if (updateError) throw updateError;

      // Delete empty items
      const emptyItems = items.filter(item => 
        !item.item_name?.trim() || !item.qty_requested || item.qty_requested === 0
      );

      if (emptyItems.length > 0) {
        for (const item of emptyItems) {
          await supabase
            .from("pull_sheet_items")
            .delete()
            .eq("id", item.id);
        }
      }

      alert(`Pull sheet committed! ${filledItems.length} items sent to pull sheet.`);
      onRefresh();
    } catch (error) {
      console.error("Error committing pull sheet:", error);
      alert("Failed to commit pull sheet");
    } finally {
      setCommitting(false);
    }
  }

  async function loadScanHistory() {
    setLoadingScanHistory(true);
    try {
      const { data, error } = await supabase
        .from("pull_sheet_scans")
        .select("*")
        .eq("pull_sheet_id", pullSheet.id)
        .order("scanned_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setScanHistory((data as any) || []);
      setShowScanHistory(true);
    } catch (error) {
      console.error("Error loading scan history:", error);
      alert("Failed to load scan history");
    } finally {
      setLoadingScanHistory(false);
    }
  }

  async function handleScanForSubstitution(scannedBarcode: string) {
    if (!substitutionModeId) return;

    try {
      // Find the scanned item by barcode
      const { data: inventoryItem, error: invError } = await (supabase as any)
        .from('inventory_items')
        .select('*')
        .eq('barcode', scannedBarcode.trim())
        .maybeSingle();

      if (invError) throw invError;
      if (!inventoryItem) {
        alert(`No item found with barcode: ${scannedBarcode}`);
        return;
      }

      // Update the item in substitution mode with the new inventory item
      const { error: updateError } = await (supabase as any)
        .from('pull_sheet_items')
        .update({
          inventory_item_id: inventoryItem.id,
          item_name: inventoryItem.name,
          category: inventoryItem.gear_type || 'Other'
        })
        .eq('id', substitutionModeId);

      if (updateError) throw updateError;

      // Exit substitution mode
      setSubstitutionModeId(null);
      alert(`Item substituted with: ${inventoryItem.name}`);
      onRefresh();
    } catch (error) {
      console.error("Error substituting item:", error);
      alert("Failed to substitute item");
    }
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    setCsvError(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Parse CSV - expect columns: item_name, qty_requested, category (optional, defaults to Audio)
      const itemsToAdd = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const [name, qtyStr, category] = line.split(',').map(s => s.trim());
        
        if (!name) continue;
        
        const qty = parseInt(qtyStr) || 1;
        if (qty <= 0) continue;

        itemsToAdd.push({
          item_name: name,
          qty_requested: qty,
          category: CATEGORY_ORDER.includes(category) ? category : 'Audio'
        });
      }

      if (itemsToAdd.length === 0) {
        setCsvError("No valid items found in CSV");
        return;
      }

      const { supabase } = await import("@/lib/supabaseClient");
      
      const { error } = await supabase
        .from("pull_sheet_items")
        .insert(
          itemsToAdd.map(item => ({
            pull_sheet_id: pullSheet.id,
            item_name: item.item_name,
            qty_requested: item.qty_requested,
            qty_pulled: 0,
            qty_fulfilled: 0,
            category: item.category,
            prep_status: "pending"
          })) as never
        );

      if (error) throw error;

      alert(`Imported ${itemsToAdd.length} items from CSV`);
      e.currentTarget.value = '';
      onRefresh();
    } catch (error) {
      console.error("Error importing CSV:", error);
      setCsvError("Failed to import CSV: " + (error as Error).message);
    }
  }

  return (
    <>
      {/* Gear Substitution Modal */}
      {substitutionModal.open && substitutionModal.item && (
        <GearSubstitutionModal
          pullSheetId={pullSheet.id}
          pullSheetItemId={substitutionModal.item.id}
          originalItem={{
            id: substitutionModal.item.inventory_item_id || '',
            name: substitutionModal.item.inventory_items?.name || substitutionModal.item.item_name || 'Unknown',
            barcode: substitutionModal.item.inventory_items?.barcode || undefined,
            category: substitutionModal.item.inventory_items?.category || undefined,
          }}
          onClose={() => setSubstitutionModal({ open: false, item: null })}
          onSubstitute={() => {
            setSubstitutionModal({ open: false, item: null });
            onRefresh();
          }}
        />
      )}

      {/* Edit Item Modal */}
      {editingItemId && editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] no-print">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-lg font-bold mb-4 text-gray-900">Edit Item</h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  value={editingItem.item_name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={editingItem.qty_requested || 0}
                  onChange={(e) => setEditingItem({ ...editingItem, qty_requested: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={editingItem.category || 'Audio'}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {CATEGORY_ORDER.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="Optional notes"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleEditItem}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingItemId(null);
                  setEditingItem(null);
                }}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan History Modal */}
      {showScanHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-lg max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4 text-gray-900">Scan History</h2>
            
            {scanHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No scans recorded for this pull sheet yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Item Name</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Quantity</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Scanned At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanHistory.map((scan) => (
                      <tr key={scan.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-900">{scan.item_name}</td>
                        <td className="px-4 py-2 text-gray-900">{scan.qty}</td>
                        <td className="px-4 py-2 text-gray-600 text-xs">
                          {new Date(scan.scanned_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowScanHistory(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showInlineAddItem && (
        <div className="bg-blue-50 border-t-2 border-blue-300 p-4 no-print">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Add Item to Pull Sheet</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div className="col-span-2 lg:col-span-2">
                <label className="block text-xs font-medium text-blue-800 mb-1">Search Inventory *</label>
                <input
                  type="text"
                  value={inventorySearch}
                  onChange={(e) => {
                    setInventorySearch(e.target.value);
                    setSelectedInventory(null);
                  }}
                  className="w-full border border-blue-300 rounded px-3 py-2 text-sm"
                  placeholder="Search by name or barcode"
                  autoFocus
                />
                <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 bg-white rounded">
                  {inventoryLoading ? (
                    <div className="p-2 text-sm text-gray-500">Searching…</div>
                  ) : inventoryResults.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No matches</div>
                  ) : (
                    inventoryResults.map((inv) => (
                      <button
                        key={inv.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm ${selectedInventory?.id === inv.id ? 'bg-amber-100 text-amber-900' : 'hover:bg-gray-50'}`}
                        onClick={() => {
                          setSelectedInventory(inv);
                          setNewItemName(inv.inventory_items?.name || (inv as any).name || '');
                          setNewItemCategory(inv.inventory_items?.category || 'Other');
                        }}
                      >
                        <div className="flex justify-between">
                          <span className="truncate">{inv.inventory_items?.name || (inv as any).name || 'Unnamed'}</span>
                          <span className="text-xs text-gray-500">{inv.inventory_items?.barcode || '—'}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-blue-800 mb-1">Qty *</label>
                <input
                  type="number"
                  min="1"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
                  className="w-full border border-blue-300 rounded px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-blue-800 mb-1">Category</label>
                <input
                  type="text"
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full border border-blue-300 rounded px-3 py-2 text-sm"
                  placeholder="Auto-filled from inventory"
                />
              </div>

              <button
                onClick={async () => {
                  if (!selectedInventory) {
                    alert('Please select an item from inventory');
                    return;
                  }
                  setAddingItem(true);
                  try {
                    const { supabase } = await import('@/lib/supabaseClient');
                    const { error } = await supabase
                      .from('pull_sheet_items')
                      .insert({
                        pull_sheet_id: pullSheet.id,
                        inventory_item_id: selectedInventory.id,
                        item_name: selectedInventory.inventory_items?.name || (selectedInventory as any).name || '',
                        qty_requested: newItemQty,
                        qty_pulled: 0,
                        qty_fulfilled: 0,
                        category: selectedInventory.inventory_items?.category || newItemCategory || 'Other',
                        prep_status: 'pending'
                      } as never);

                    if (error) throw error;
                    setInventorySearch('');
                    setInventoryResults([]);
                    setSelectedInventory(null);
                    setNewItemQty(1);
                    setNewItemCategory('Audio');
                    setShowInlineAddItem(false);
                    onRefresh();
                  } catch (err) {
                    console.error('Failed to add inventory item to pull sheet:', err);
                    alert('Failed to add item');
                  } finally {
                    setAddingItem(false);
                  }
                }}
                disabled={!selectedInventory || addingItem}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                {addingItem ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowInlineAddItem(false);
                  setInventorySearch('');
                  setInventoryResults([]);
                  setSelectedInventory(null);
                  setNewItemQty(1);
                  setNewItemCategory('Audio');
                }}
                disabled={addingItem}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 disabled:opacity-50 font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-sky-50">
        {/* No-print navigation & scanner */}
        <div className="no-print bg-white border-b border-gray-200 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
                <span>Back</span>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowInlineAddItem(!showInlineAddItem)}
                  className="btn-primary flex items-center gap-2"
                >
                  + Add Item
                </button>
                <button
                  onClick={handlePrint}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Printer size={18} />
                  Print
                </button>
                <button
                  onClick={loadScanHistory}
                  disabled={loadingScanHistory}
                  className="btn-secondary flex items-center gap-2"
                >
                  {loadingScanHistory ? "Loading..." : "Scan History"}
                </button>
                <button
                  onClick={handleCommitPullSheet}
                  disabled={committing}
                  className="btn-primary flex items-center gap-2"
                >
                  {committing ? "Finalizing..." : "Finalize to Pull Sheets"}
                </button>
              </div>
            </div>
            <BarcodeScanner 
              pullSheetId={pullSheet.id} 
              onScan={(scan) => {
                if (substitutionModeId) {
                  handleScanForSubstitution(scan?.barcode || '');
                } else {
                  onRefresh();
                }
              }}
            />
            {substitutionModeId && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded text-sm text-yellow-800">
                <strong>Substitution Mode Active:</strong> Scan or type a barcode to substitute the selected item.
              </div>
            )}
          </div>
        </div>

        {/* Printable Pull Sheet */}
        <div className="max-w-7xl mx-auto p-8 bg-white my-6 shadow-lg print:shadow-none print:my-0">
          {/* Header Section */}
          <div className="border-b-2 border-gray-800 pb-4 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">PULL SHEET</h1>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold">Pull Sheet Number: <span className="text-blue-600">{pullSheet.jobs?.code || pullSheet.name}</span></div>
                <div className="text-lg font-semibold mt-1">{pullSheet.jobs?.title || pullSheet.name}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Generated: {new Date().toLocaleDateString()}</div>
                <div className={`inline-block px-3 py-1 rounded text-xs font-semibold mt-1 ${
                  pullSheet.status === 'finalized' ? 'bg-green-100 text-green-800' :
                  pullSheet.status === 'picking' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {pullSheet.status?.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Client & Venue Information */}
          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div>
              <div className="font-semibold text-gray-700 mb-2">CLIENT</div>
              <div className="text-gray-900">{pullSheet.jobs?.client || '—'}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-2">VENUE / SITE</div>
              <div className="text-gray-900">To be configured</div>
            </div>
          </div>

          {/* Pull Sheet Details */}
          <div className="grid grid-cols-3 gap-4 mb-6 text-xs border-y border-gray-300 py-3">
            <div>
              <span className="font-semibold text-gray-700">Pull Date: </span>
              <span className="text-gray-900">{formatDate(pullSheet.scheduled_out_at)}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Load Out: </span>
              <span className="text-gray-900">{formatDate(pullSheet.scheduled_out_at)}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Expected Return: </span>
              <span className="text-gray-900">{formatDate(pullSheet.expected_return_at)}</span>
            </div>
          </div>

          {/* Items by Category */}
          <div className="mb-6">
            {categoriesToDisplay.map(category => {
              const categoryItems = itemsByCategory[category] || [];
              const hasItems = categoryItems.length > 0;
              
              return (
              <div key={category} className="mb-8 break-inside-avoid">
                {/* Category Header */}
                <div className="bg-gray-800 text-white px-3 py-2 font-bold text-sm mb-0">
                  {category.toUpperCase()}
                </div>

                {/* Category Items Table */}
                <table className="w-full text-xs border-collapse border border-gray-300">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-100">
                      <th className="text-left py-2 px-2 font-semibold w-16 border-r border-gray-300">QTY</th>
                      <th className="text-left py-2 px-2 font-semibold border-r border-gray-300">ITEM</th>
                      <th className="text-left py-2 px-2 font-semibold w-32 border-r border-gray-300">NOTES</th>
                      <th className="text-left py-2 px-2 font-semibold w-16 border-r border-gray-300">PREP</th>
                      <th className="no-print text-left py-2 px-2 font-semibold w-24">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hasItems ? (
                      categoryItems.map(item => {
                        const fulfilled = item.qty_fulfilled || 0;
                        const requested = item.qty_requested || 0;
                        const isComplete = fulfilled >= requested;
                        
                        return (
                        <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-2 px-2 border-r border-gray-200 cursor-pointer hover:bg-blue-50" onClick={(e) => {
                            e.stopPropagation();
                            setEditingCellId(`${item.id}-qty_requested`);
                            setEditingCellValue(String(item.qty_requested || 0));
                          }}>
                            {editingCellId === `${item.id}-qty_requested` ? (
                              <input
                                type="number"
                                min="0"
                                value={editingCellValue}
                                onChange={(e) => setEditingCellValue(e.target.value)}
                                onBlur={() => saveCellEdit(item.id, 'qty_requested', editingCellValue)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveCellEdit(item.id, 'qty_requested', editingCellValue);
                                  if (e.key === 'Escape') setEditingCellId(null);
                                }}
                                autoFocus
                                className="w-full border border-blue-400 rounded px-1 py-0 text-sm"
                              />
                            ) : (
                              <div className={`font-bold text-sm ${isComplete ? 'text-green-600' : 'text-amber-600'}`}>
                                {fulfilled}/{requested}
                              </div>
                            )}
                            {!editingCellId && (
                              <>
                                {isComplete && (
                                  <div className="text-green-600 text-[10px] font-semibold">
                                    ✓ Complete
                                  </div>
                                )}
                                {!isComplete && fulfilled > 0 && (
                                  <div className="text-amber-600 text-[10px]">
                                    In Progress
                                  </div>
                                )}
                              </>
                            )}
                          </td>
                          <td className="py-2 px-2 border-r border-gray-200">
                            <div className="font-medium">{item.inventory_items?.name || item.item_name || 'Unknown Item'}</div>
                            {item.inventory_items?.barcode && (
                              <div className="text-gray-500 text-[10px] font-mono mt-1">
                                {item.inventory_items.barcode}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-gray-600 border-r border-gray-200 cursor-pointer hover:bg-blue-50" onClick={(e) => {
                            e.stopPropagation();
                            setEditingCellId(`${item.id}-notes`);
                            setEditingCellValue(item.notes || '');
                          }}>
                            {editingCellId === `${item.id}-notes` ? (
                              <input
                                type="text"
                                value={editingCellValue}
                                onChange={(e) => setEditingCellValue(e.target.value)}
                                onBlur={() => saveCellEdit(item.id, 'notes', editingCellValue)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveCellEdit(item.id, 'notes', editingCellValue);
                                  if (e.key === 'Escape') setEditingCellId(null);
                                }}
                                autoFocus
                                className="w-full border border-blue-400 rounded px-1 py-0 text-sm"
                              />
                            ) : (
                              item.notes || '—'
                            )}
                          </td>
                          <td className="py-2 px-2 border-r border-gray-200 cursor-pointer hover:bg-blue-50" onClick={(e) => {
                            e.stopPropagation();
                            setEditingCellId(`${item.id}-prep_status`);
                            setEditingCellValue(item.prep_status || 'pending');
                          }}>
                            {editingCellId === `${item.id}-prep_status` ? (
                              <select
                                value={editingCellValue}
                                onChange={(e) => setEditingCellValue(e.target.value)}
                                onBlur={() => saveCellEdit(item.id, 'prep_status', editingCellValue)}
                                autoFocus
                                className="w-full border border-blue-400 rounded px-1 py-0 text-sm"
                              >
                                <option value="pending">Pending</option>
                                <option value="pulled">Pulled</option>
                                <option value="prepped">Prepped</option>
                              </select>
                            ) : (
                              <div className={`text-center px-2 py-1 rounded text-[10px] font-semibold ${
                                item.prep_status === 'pulled' ? 'bg-green-100 text-green-800' :
                                item.prep_status === 'prepped' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {item.prep_status || 'PENDING'}
                              </div>
                            )}
                          </td>
                          <td className="no-print py-2 px-2 relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSubstitutionModeId(substitutionModeId === item.id ? null : item.id)}
                              className={`px-3 py-1 rounded text-[10px] font-medium transition-colors ${
                                substitutionModeId === item.id
                                  ? 'bg-blue-600 text-white'
                                  : 'text-purple-600 hover:text-purple-800'
                              }`}
                            >
                              Substitute
                            </button>
                          </td>
                        </tr>
                      );
                      })
                    ) : null}
                  </tbody>
                </table>
              </div>
              );
            })}
          </div>

          {/* Notes Section */}
          <div className="border-t-2 border-gray-800 pt-4 mt-8 mb-8">
            <div className="font-semibold text-gray-700 mb-2">ADDITIONAL NOTES:</div>
            {pullSheet.notes ? (
              <div className="text-sm text-gray-900 whitespace-pre-wrap">{pullSheet.notes}</div>
            ) : (
              <div className="border border-gray-300 rounded p-3 min-h-[80px] bg-gray-50"></div>
            )}
          </div>

          {/* Signature Section */}
          <div className="border-t border-gray-800 pt-6 mt-8">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="font-semibold text-gray-700 mb-4">PULLED BY:</div>
                <div className="border-b-2 border-gray-400 pb-1 mb-2 min-h-[40px]"></div>
                <div className="text-xs text-gray-500">Signature</div>
                <div className="border-b border-gray-300 pb-1 mt-4 mb-2"></div>
                <div className="text-xs text-gray-500">Date / Time</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 mb-4">CHECKED BY:</div>
                <div className="border-b-2 border-gray-400 pb-1 mb-2 min-h-[40px]"></div>
                <div className="text-xs text-gray-500">Signature</div>
                <div className="border-b border-gray-300 pb-1 mt-4 mb-2"></div>
                <div className="text-xs text-gray-500">Date / Time</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-gray-800 mt-8 pt-4 text-xs text-gray-600">
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="text-center">
                <div className="font-semibold text-gray-800">Equipment must be returned clean</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-800">Report any damage immediately</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-800">Verify all items before departure</div>
              </div>
            </div>
            <div className="text-center border-t border-gray-300 pt-3 mt-3">
              <div className="font-semibold">This pull sheet is valid for the specified dates only.</div>
              <div className="text-gray-500 mt-1">All items must be accounted for and returned in the same condition as pulled.</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          @page {
            margin: 0.5in;
          }
        }
      `}</style>
    </>
  );
}
