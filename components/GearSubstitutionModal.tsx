"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, Search, RefreshCw } from "lucide-react";

type SubstitutionModalProps = {
  pullSheetId: string;
  pullSheetItemId: string;
  originalItem: {
    id: string;
    name: string;
    barcode?: string;
    category?: string;
  };
  onClose: () => void;
  onSubstitute?: (substitution: any) => void;
};

type InventoryItem = {
  id: string;
  name: string;
  barcode: string | null;
  category: string | null;
  location: string | null;
  quantity: number | null;
};

export default function GearSubstitutionModal({
  pullSheetId,
  pullSheetItemId,
  originalItem,
  onClose,
  onSubstitute,
}: SubstitutionModalProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load similar items on mount (same category)
  useEffect(() => {
    if (originalItem.category) {
      loadSimilarItems();
    }
  }, [originalItem.category]);

  async function loadSimilarItems() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, barcode, category, location, quantity')
        .eq('category', originalItem.category || '')
        .neq('id', originalItem.id)
        .order('name', { ascending: true })
        .limit(20);

      if (error) throw error;
      setResults((data as any[]) || []);
    } catch (err) {
      console.error('Error loading similar items:', err);
    } finally {
      setLoading(false);
    }
  }

  async function searchItems() {
    if (!search.trim()) {
      loadSimilarItems();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, barcode, category, location, quantity')
        .or(`name.ilike.%${search.trim()}%,barcode.ilike.%${search.trim()}%`)
        .neq('id', originalItem.id)
        .order('name', { ascending: true })
        .limit(20);

      if (error) throw error;
      setResults((data as any[]) || []);
    } catch (err) {
      console.error('Error searching items:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubstitute() {
    if (!selected) return;

    setSubmitting(true);
    try {
      // 1. Record the substitution
      const substitutionData = {
        pull_sheet_id: pullSheetId,
        pull_sheet_item_id: pullSheetItemId,
        original_inventory_item_id: originalItem.id,
        original_item_name: originalItem.name,
        substitute_inventory_item_id: selected.id,
        substitute_item_name: selected.name,
        reason: reason.trim() || 'Not specified',
        substituted_by: 'Current User', // TODO: Get from auth context
        qty_affected: 1,
        notes: null,
      };

      const { data: substitution, error: subError } = await (supabase
        .from('pull_sheet_substitutions') as any)
        .insert([substitutionData])
        .select()
        .single();

      if (subError) throw subError;

      // 2. Update the pull sheet item to reference the new inventory item
      await (supabase
        .from('pull_sheet_items') as any)
        .update({
          inventory_item_id: selected.id,
          item_name: selected.name,
          notes: `Substituted from: ${originalItem.name}. Reason: ${reason.trim() || 'Not specified'}`,
        })
        .eq('id', pullSheetItemId);

      // 3. Call callback
      if (onSubstitute) {
        onSubstitute(substitution);
      }

      onClose();
    } catch (err: any) {
      console.error('Substitution error:', err);
      alert(`Error: ${err.message || 'Failed to substitute item'}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-w-3xl w-full bg-zinc-900 rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-zinc-800 border-b border-zinc-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <RefreshCw size={24} className="text-amber-400" />
              Substitute Gear
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Replace <span className="text-amber-400 font-medium">{originalItem.name}</span> with alternative
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Search for replacement item
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchItems()}
                  placeholder="Search by name or barcode..."
                  className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                />
              </div>
              <button
                onClick={searchItems}
                disabled={loading}
                className="px-4 py-2 bg-amber-500 text-black rounded hover:bg-amber-400 font-medium disabled:opacity-50"
              >
                Search
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Showing {originalItem.category ? `items in "${originalItem.category}" category` : 'similar items'}
            </p>
          </div>

          {/* Results */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Select replacement item
            </label>
            {loading ? (
              <div className="text-center py-8 text-zinc-500">Loading items...</div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 bg-zinc-800 rounded border border-zinc-700">
                No items found. Try a different search.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      selected?.id === item.id
                        ? 'bg-amber-500/20 border-amber-500 text-white'
                        : 'bg-zinc-800 border-zinc-700 hover:border-amber-500/50 text-zinc-300'
                    }`}
                  >
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-zinc-500 mt-1 flex gap-4">
                      {item.barcode && (
                        <span className="font-mono">Barcode: {item.barcode}</span>
                      )}
                      {item.category && (
                        <span>Category: {item.category}</span>
                      )}
                      {item.location && (
                        <span>Location: {item.location}</span>
                      )}
                      {item.quantity !== null && (
                        <span className={item.quantity > 0 ? 'text-green-400' : 'text-red-400'}>
                          Qty: {item.quantity}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Reason for substitution
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
            >
              <option value="">Select a reason...</option>
              <option value="Original not available">Original not available</option>
              <option value="Original damaged">Original damaged</option>
              <option value="Customer requested">Customer requested</option>
              <option value="Better alternative">Better alternative</option>
              <option value="Emergency replacement">Emergency replacement</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Selected Item Summary */}
          {selected && (
            <div className="bg-zinc-800 border border-amber-500/50 rounded p-4">
              <div className="text-sm font-medium text-zinc-400 mb-2">Selected Replacement:</div>
              <div className="text-lg font-semibold text-white">{selected.name}</div>
              {selected.barcode && (
                <div className="text-sm text-zinc-400 mt-1 font-mono">{selected.barcode}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-zinc-800 border-t border-zinc-700 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubstitute}
            disabled={!selected || !reason.trim() || submitting}
            className="px-6 py-2 bg-amber-500 text-black rounded hover:bg-amber-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Substituting...' : 'Confirm Substitution'}
          </button>
        </div>
      </div>
    </div>
  );
}
