"use client";

import { supabase } from "@/lib/supabaseClient";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Types
type AddItemPayload = {
  inventory_item_id?: string | null;
  product_id?: string | null;
  item_name: string;
  qty_requested: number;
  notes?: string | null;
};

type InventoryResult = {
  id: string;
  name: string;
  barcode: string | null;
  gear_type: string | null;
};

type HeaderForm = {
  name: string;
  status: string;
  scheduled_out_at: string;
  expected_return_at: string;
  notes: string;
};

type Item = {
  id: string;
  products?: { sku?: string };
  inventory_items?: { barcode?: string };
  qty_requested?: number;
  qty_pulled?: number;
  notes?: string | null;
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "picking", label: "Picking" },
  { value: "finalized", label: "Finalized" },
];

function statusClass(status: string) {
  switch (status) {
    case "finalized":
      return "bg-green-500/20 text-green-200 border border-green-400/40";
    case "picking":
      return "bg-blue-500/20 text-blue-200 border border-blue-400/40";
    default:
      return "bg-white/10 text-white/70 border border-white/20";
  }
}

// AddItemModal Component
const AddItemModal: React.FC<{
  onClose: () => void;
  onAdd: (payload: AddItemPayload) => Promise<void>;
  inline?: boolean;
}> = ({ onClose, onAdd, inline }) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<InventoryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<InventoryResult | null>(null);
  const [customName, setCustomName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      if (!search.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("inventory_items")
        .select("id, name, barcode, gear_type")
        .or(`name.ilike.%${search.trim()}%,barcode.ilike.%${search.trim()}%`)
        .order("name", { ascending: true })
        .limit(25);
      if (!active) return;
      if (fetchError) {
        setModalError(typeof fetchError === "string" ? fetchError : fetchError.message);
        setResults([]);
      } else {
        setModalError(null);
        const typed = (data ?? []) as InventoryResult[];
        setResults(
          typed.map((item) => ({
            id: item.id,
            name: item.name ?? "Unnamed",
            barcode: item.barcode,
            gear_type: item.gear_type,
          }))
        );
      }
      setLoading(false);
    };
    fetchData();
    return () => {
      active = false;
    };
  }, [search]);

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-gray-500">Search Inventory</label>
        <input
          className="w-full rounded border border-gray-300 bg-white px-3 md:px-4 py-2 text-sm md:text-base text-gray-900 focus:border-amber-400 focus:outline-none"
          placeholder="Scan or search by name / barcode"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setSearch("")}
        />
        <div className="mt-2 max-h-48 md:max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No inventory matches.</div>
          ) : (
            results.map((result) => (
              <button
                key={result.id}
                type="button"
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                  selected?.id === result.id ? "bg-amber-100 text-amber-900" : "hover:bg-gray-100 text-gray-900"
                }`}
                onClick={() => {
                  setSelected(result);
                  setCustomName(result.name);
                }}
              >
                <span className="truncate pr-2">{result.name}</span>
                <span className="text-xs text-gray-500 flex-shrink-0">{result.barcode ?? ""}</span>
              </button>
            ))
          )}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-gray-500">Or enter custom name</label>
        <input
          className="w-full rounded border border-gray-300 bg-white px-3 md:px-4 py-2 text-sm md:text-base text-gray-900 focus:border-amber-400 focus:outline-none"
          placeholder="Custom item name"
          value={customName}
          onChange={(e) => {
            setCustomName(e.target.value);
            if (e.target.value.trim()) {
              setSelected(null);
            }
          }}
        />
      </div>
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-gray-500">Quantity</label>
          <input
            type="number"
            min={1}
            className="w-full rounded border border-gray-300 bg-white px-3 md:px-4 py-2 text-sm md:text-base text-gray-900 focus:border-amber-400 focus:outline-none"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-gray-500">Notes</label>
          <input
            className="w-full rounded border border-gray-300 bg-white px-3 md:px-4 py-2 text-sm md:text-base text-gray-900 focus:border-amber-400 focus:outline-none"
            placeholder="Optional notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
      {modalError && (
        <div className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {modalError}
        </div>
      )}
      <div className="mt-4 md:mt-6 flex flex-col sm:flex-row justify-end gap-2 md:gap-3">
        <button
          type="button"
          className="rounded border border-gray-300 px-4 py-2 text-sm md:text-base text-gray-700 hover:border-gray-400 order-2 sm:order-1"
          onClick={() => {
            setSelected(null);
            setNotes("");
            setQuantity(1);
            onClose();
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded bg-amber-400 px-4 py-2 text-sm md:text-base font-semibold text-gray-900 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 order-1 sm:order-2"
          disabled={submitting}
        >
          {submitting ? "Adding…" : "Add Item"}
        </button>
      </div>
    </div>
  );
};

// Main Component
const PullSheetDetailClient: React.FC = () => {
  const router = useRouter();
  const [editHeader, setEditHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState<HeaderForm>({
    name: "",
    status: "draft",
    scheduled_out_at: "",
    expected_return_at: "",
    notes: "",
  });
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [headerSaving, setHeaderSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [canCreateSheet, setCanCreateSheet] = useState(true);
  const [sheet, setSheet] = useState<{ notes?: string }>({});
  const [addModalOpen, setAddModalOpen] = useState(false);

  const handleHeaderSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setHeaderSaving(true);
    // Add your save logic here
    setHeaderSaving(false);
  };

  const updateItemField = (id: string, changes: Partial<Item>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  };

  const moveItem = (id: string, direction: number) => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const newItems = [...prev];
      [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
      return newItems;
    });
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const resolvedItemName = (item: Item) => {
    return item.products?.sku || item.inventory_items?.barcode || "Unknown Item";
  };

  return (
    <div className="p-4 md:p-6">
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg p-4 md:p-6 max-h-[90vh] overflow-y-auto">
            <AddItemModal
              onClose={() => setAddModalOpen(false)}
              onAdd={async (payload) => {
                // Add your item creation logic here
                setAddModalOpen(false);
              }}
            />
          </div>
        </div>
      )}

      <div className="mb-4 md:mb-6">
        <button
          onClick={() => router.push('/app/warehouse/pull-sheets')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm md:text-base"
        >
          <span>←</span>
          <span>Back to Pull Sheets</span>
        </button>
      </div>

      <section>
        {editHeader && (
          <form onSubmit={handleHeaderSave} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-white/40">Pull Sheet Name</label>
                <input
                  className="w-full rounded-lg border border-white/10 bg-[#0c0d10] px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
                  value={headerForm.name}
                  onChange={(e) => setHeaderForm((prev: HeaderForm) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-white/40">Status</label>
                <select
                  className="w-full rounded-lg border border-white/10 bg-[#0c0d10] px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
                  value={headerForm.status}
                  onChange={(e) => setHeaderForm((prev: HeaderForm) => ({ ...prev, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-white/40">Scheduled Out</label>
                <input
                  type="datetime-local"
                  className="w-full rounded-lg border border-white/10 bg-[#0c0d10] px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
                  value={headerForm.scheduled_out_at}
                  onChange={(e) => setHeaderForm((prev: HeaderForm) => ({ ...prev, scheduled_out_at: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-white/40">Expected Return</label>
                <input
                  type="datetime-local"
                  className="w-full rounded-lg border border-white/10 bg-[#0c0d10] px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
                  value={headerForm.expected_return_at}
                  onChange={(e) => setHeaderForm((prev: HeaderForm) => ({ ...prev, expected_return_at: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-white/40">Notes</label>
              <textarea
                className="w-full rounded-lg border border-white/10 bg-[#0c0d10] px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
                rows={3}
                value={headerForm.notes}
                onChange={(e) => setHeaderForm((prev: HeaderForm) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            {headerError && (
              <div className="rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {headerError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="submit"
                className="rounded bg-amber-400 px-4 py-2 font-semibold text-[#0c0d10] hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={headerSaving}
              >
                {headerSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        {sheet.notes && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
            <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">Notes</div>
            <div className="whitespace-pre-wrap">{sheet.notes}</div>
          </div>
        )}
      </section>

      <section className="rounded-xl border-2 border-gray-200 bg-white p-4 md:p-6 shadow">
        <div className="mb-4">
          <h2 className="text-base md:text-lg font-semibold text-gray-900">Pull Sheet Items</h2>
          <p className="text-xs md:text-sm text-gray-600">Adjust quantities inline, reorder for workflow, or add new equipment from inventory.</p>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No items on this pull sheet yet.
            </div>
          ) : (
            items.map((item, index) => {
              const blocked = blockedIds.includes(item.id);
              const resolvedName = resolvedItemName(item);
              const sku = item.products?.sku ?? item.inventory_items?.barcode ?? "—";
              const itemDisabled = blocked || !canCreateSheet;
              return (
                <div key={item.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{resolvedName}</div>
                      <div className="text-xs text-gray-500 mt-1">SKU: {sku}</div>
                    </div>
                    {canCreateSheet && (
                      <button
                        className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-40 ml-2"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={itemDisabled}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Qty Requested</label>
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-amber-400 focus:outline-none"
                        defaultValue={item.qty_requested ?? 0}
                        disabled={itemDisabled}
                        onBlur={(e) => {
                          if (!canCreateSheet) return;
                          const value = Number(e.target.value);
                          if (!Number.isFinite(value)) return;
                          if (value !== item.qty_requested) {
                            updateItemField(item.id, { qty_requested: value });
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Qty Pulled</label>
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-amber-400 focus:outline-none"
                        defaultValue={item.qty_pulled ?? 0}
                        disabled={itemDisabled}
                        onBlur={(e) => {
                          if (!canCreateSheet) return;
                          const value = Number(e.target.value);
                          if (!Number.isFinite(value)) return;
                          if (value !== item.qty_pulled) {
                            updateItemField(item.id, { qty_pulled: value });
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="text-xs text-gray-500 block mb-1">Notes</label>
                    <textarea
                      rows={2}
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-amber-400 focus:outline-none"
                      defaultValue={item.notes ?? ""}
                      disabled={itemDisabled}
                      onBlur={(e) => {
                        if (!canCreateSheet) return;
                        const value = e.target.value.trim();
                        if (value !== (item.notes ?? "")) {
                          updateItemField(item.id, { notes: value || null });
                        }
                      }}
                    />
                  </div>

                  {canCreateSheet && (
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-gray-400 disabled:opacity-40"
                        onClick={() => moveItem(item.id, -1)}
                        disabled={index === 0 || itemDisabled}
                      >
                        ↑ Move Up
                      </button>
                      <button
                        className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-gray-400 disabled:opacity-40"
                        onClick={() => moveItem(item.id, 1)}
                        disabled={index === items.length - 1 || itemDisabled}
                      >
                        ↓ Move Down
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
          {canCreateSheet && (
            <div className="text-center pt-2">
              <button
                className="rounded-lg bg-gray-700 px-4 py-2 font-semibold text-white hover:bg-gray-600 text-sm w-full"
                onClick={() => setAddModalOpen(true)}
              >
                + Add Item
              </button>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block rounded-xl border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">SKU / Barcode</th>
                <th className="px-4 py-3 text-right">Qty Req</th>
                <th className="px-4 py-3 text-right">Qty Pulled</th>
                <th className="px-4 py-3 text-left">Notes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    No items on this pull sheet yet.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const blocked = blockedIds.includes(item.id);
                  const resolvedName = resolvedItemName(item);
                  const sku = item.products?.sku ?? item.inventory_items?.barcode ?? "—";
                  const itemDisabled = blocked || !canCreateSheet;
                  return (
                    <tr key={item.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{resolvedName}</td>
                      <td className="px-4 py-3 text-gray-600">{sku}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          className="w-24 rounded border border-gray-300 bg-white px-2 py-1 text-right text-gray-900 focus:border-amber-400 focus:outline-none"
                          defaultValue={item.qty_requested ?? 0}
                          disabled={itemDisabled}
                          onBlur={(e) => {
                            if (!canCreateSheet) return;
                            const value = Number(e.target.value);
                            if (!Number.isFinite(value)) return;
                            if (value !== item.qty_requested) {
                              updateItemField(item.id, { qty_requested: value });
                            }
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          className="w-24 rounded border border-gray-300 bg-white px-2 py-1 text-right text-gray-900 focus:border-amber-400 focus:outline-none"
                          defaultValue={item.qty_pulled ?? 0}
                          disabled={itemDisabled}
                          onBlur={(e) => {
                            if (!canCreateSheet) return;
                            const value = Number(e.target.value);
                            if (!Number.isFinite(value)) return;
                            if (value !== item.qty_pulled) {
                              updateItemField(item.id, { qty_pulled: value });
                            }
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <textarea
                          rows={2}
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-amber-400 focus:outline-none"
                          defaultValue={item.notes ?? ""}
                          disabled={itemDisabled}
                          onBlur={(e) => {
                            if (!canCreateSheet) return;
                            const value = e.target.value.trim();
                            if (value !== (item.notes ?? "")) {
                              updateItemField(item.id, { notes: value || null });
                            }
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {canCreateSheet && (
                          <div className="flex justify-end gap-2">
                            <button
                              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:border-gray-400 disabled:opacity-40"
                              onClick={() => moveItem(item.id, -1)}
                              disabled={index === 0 || itemDisabled}
                            >
                              ↑
                            </button>
                            <button
                              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:border-gray-400 disabled:opacity-40"
                              onClick={() => moveItem(item.id, 1)}
                              disabled={index === items.length - 1 || itemDisabled}
                            >
                              ↓
                            </button>
                            <button
                              className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-40"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={itemDisabled}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
              {canCreateSheet && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center">
                    <button
                      className="rounded-lg bg-gray-700 px-4 py-2 font-semibold text-white hover:bg-gray-600"
                      onClick={() => setAddModalOpen(true)}
                    >
                      + Add Item
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default PullSheetDetailClient;


