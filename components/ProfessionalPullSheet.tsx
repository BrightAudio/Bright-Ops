"use client";

import { useState } from "react";
import BarcodeScanner from "@/components/BarcodeScanner";
import GearSubstitutionModal from "@/components/GearSubstitutionModal";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Printer, ArrowLeft, Upload } from "lucide-react";

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
  const [addingItem, setAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<Item> | null>(null);
  const [committing, setCommitting] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

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
      
      const { error } = await supabase
        .from("pull_sheet_items")
        .update({
          item_name: editingItem.item_name,
          qty_requested: editingItem.qty_requested,
          category: editingItem.category,
          notes: editingItem.notes
        } as any)
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
      const { error: updateError } = await supabase
        .from("pull_sheets")
        .update({ status: "picking" } as any)
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
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
      {showInlineAddItem && (
        <div className="bg-blue-50 border-t-2 border-blue-300 p-4 no-print">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Add Item to Pull Sheet</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-blue-800 mb-1">Item Name *</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full border border-blue-300 rounded px-3 py-2 text-sm"
                  placeholder="e.g., Shure SM58"
                  autoFocus
                />
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
                <label className="block text-xs font-medium text-blue-800 mb-1">Category *</label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full border border-blue-300 rounded px-3 py-2 text-sm"
                >
                  {CATEGORY_ORDER.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAddItem}
                disabled={!newItemName.trim() || addingItem}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                {addingItem ? "Adding..." : "Add"}
              </button>
              <button
                onClick={() => {
                  setShowInlineAddItem(false);
                  setNewItemName("");
                  setNewItemQty(1);
                  setNewItemCategory("Audio");
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

      <div className="min-h-screen bg-gray-50">
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
                <Link
                  href={`/app/warehouse/scans`}
                  className="btn-secondary flex items-center gap-2"
                >
                  View Scans
                </Link>
              </div>
            </div>
            <BarcodeScanner pullSheetId={pullSheet.id} onScan={onRefresh} />
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
                          <td className="py-2 px-2 border-r border-gray-200">
                            <div className={`font-bold text-sm ${isComplete ? 'text-green-600' : 'text-amber-600'}`}>
                              {fulfilled}/{requested}
                            </div>
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
                          </td>
                          <td className="py-2 px-2 border-r border-gray-200">
                            <div className="font-medium">{item.inventory_items?.name || item.item_name || 'Unknown Item'}</div>
                            {item.inventory_items?.barcode && (
                              <div className="text-gray-500 text-[10px] font-mono mt-1">
                                {item.inventory_items.barcode}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-gray-600 border-r border-gray-200">
                            {item.notes || '—'}
                          </td>
                          <td className="py-2 px-2 border-r border-gray-200">
                            <div className={`text-center px-2 py-1 rounded text-[10px] font-semibold ${
                              item.prep_status === 'pulled' ? 'bg-green-100 text-green-800' :
                              item.prep_status === 'prepped' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {item.prep_status || 'PENDING'}
                            </div>
                          </td>
                          <td className="no-print py-2 px-2">
                            <button
                              onClick={() => setSubstitutionModal({ open: true, item })}
                              className="text-purple-600 hover:text-purple-800 text-[10px] font-medium"
                            >
                              Substitute
                            </button>
                          </td>
                        </tr>
                      );
                      })
                    ) : (
                      // Empty rows for professional look
                      <>
                        {[...Array(3)].map((_, idx) => (
                          <tr key={`empty-${category}-${idx}`} className="border-b border-gray-200">
                            <td className="py-3 px-2 border-r border-gray-200 text-gray-300">—</td>
                            <td className="py-3 px-2 border-r border-gray-200 text-gray-400 italic">No items in this category</td>
                            <td className="py-3 px-2 border-r border-gray-200 text-gray-300">—</td>
                            <td className="py-3 px-2 border-r border-gray-200 text-gray-300">—</td>
                            <td className="no-print py-3 px-2"></td>
                          </tr>
                        ))}
                      </>
                    )}
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
            <div className="grid grid-cols-2 gap-8 mb-6">
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
            
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="font-semibold text-gray-700 mb-4">RETURNED BY:</div>
                <div className="border-b-2 border-gray-400 pb-1 mb-2 min-h-[40px]"></div>
                <div className="text-xs text-gray-500">Signature</div>
                <div className="border-b border-gray-300 pb-1 mt-4 mb-2"></div>
                <div className="text-xs text-gray-500">Date / Time</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 mb-4">VERIFIED BY:</div>
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
