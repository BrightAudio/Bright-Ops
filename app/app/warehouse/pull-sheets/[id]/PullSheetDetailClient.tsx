"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  addPullSheetItem,
  deletePullSheet,
  deletePullSheetItem,
  reorderPullSheetItems,
  updatePullSheet,
  updatePullSheetItem,
  usePullSheet,
} from "@/lib/hooks/usePullSheets";
import type { PullSheetItem } from "@/lib/hooks/usePullSheets";
import type { PullsheetPermissions } from "@/lib/permissions";
import { supabase } from "@/lib/supabaseClient";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "picking", label: "Picking" },
  { value: "finalized", label: "Finalized" },
];

type InventoryResult = {
  id: string;
  name: string;
  barcode: string | null;
  gear_type: string | null;
};

type AddItemPayload = {
  inventory_item_id?: string | null;
  product_id?: string | null;
  item_name: string;
  qty_requested: number;
  notes?: string | null;
};

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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export default function PullSheetDetailClient({
  permissions,
}: {
  permissions: PullsheetPermissions;
}) {
  const params = useParams();
  const router = useRouter();
  const pullSheetId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const { sheet, items, loading, error, refetch } = usePullSheet(pullSheetId);
  const [editHeader, setEditHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({
    name: "",
    status: "draft",
    scheduled_out_at: "",
    expected_return_at: "",
    notes: "",
  });
  const [headerSaving, setHeaderSaving] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  const canCreateSheet = !!permissions?.can_create_pullsheets;
  const canDeleteSheet = !!permissions?.can_delete_pullsheets;
  const [permissionAlert, setPermissionAlert] = useState<string | null>(
    canCreateSheet
      ? null
      : "You can view this pull sheet but cannot edit it. Ask an owner to update your permissions."
  );

  useEffect(() => {
    if (sheet) {
      setHeaderForm({
        name: sheet.name,
        status: sheet.status,
        scheduled_out_at: sheet.scheduled_out_at ?? "",
        expected_return_at: sheet.expected_return_at ?? "",
        notes: sheet.notes ?? "",
      });
    }
  }, [sheet]);

  async function handleHeaderSave(e: React.FormEvent) {
    e.preventDefault();
    if (!sheet) return;
    if (!canCreateSheet) {
      setHeaderError("You do not have permission to update pull sheets.");
      setPermissionAlert(
        "You do not have permission to modify pull sheets. Ask an owner to update your access."
      );
      return;
    }
    setHeaderSaving(true);
    setHeaderError(null);
    try {
      await updatePullSheet(sheet.id, {
        name: headerForm.name,
        status: headerForm.status,
        scheduled_out_at: headerForm.scheduled_out_at || null,
        expected_return_at: headerForm.expected_return_at || null,
        notes: headerForm.notes.trim() || null,
      });
      setEditHeader(false);
      refetch();
    } catch (err) {
      setHeaderError((err as Error).message);
    } finally {
      setHeaderSaving(false);
    }
  }

  async function handleDeleteSheet() {
    if (!sheet) return;
    if (!canDeleteSheet) {
      setDeleteError("You do not have permission to delete pull sheets.");
      setPermissionAlert(
        "You do not have permission to delete pull sheets. Ask an owner to update your access."
      );
      return;
    }
    try {
      await deletePullSheet(sheet.id);
      router.push("/app/warehouse/pull-sheets");
    } catch (err) {
      setDeleteError((err as Error).message);
    }
  }

  async function handleAddItem(payload: AddItemPayload) {
    if (!sheet) return;
    if (!canCreateSheet) {
      setPermissionAlert(
        "You do not have permission to modify pull sheets. Ask an owner to update your access."
      );
      return;
    }
    await addPullSheetItem({
      pull_sheet_id: sheet.id,
      inventory_item_id: payload.inventory_item_id ?? null,
      product_id: payload.product_id ?? null,
      item_name: payload.item_name,
      qty_requested: payload.qty_requested,
      qty_pulled: 0,
      notes: payload.notes ?? null,
      sort_index: items.length * 100,
    });
    refetch();
  }

  async function updateItemField(id: string, updates: Partial<PullSheetItem>) {
    if (!canCreateSheet) {
      setPermissionAlert(
        "You do not have permission to modify pull sheets. Ask an owner to update your access."
      );
      return;
    }
    setBlockedIds((prev) => [...new Set([...prev, id])]);
    try {
      await updatePullSheetItem(id, updates);
      refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setBlockedIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  }

  async function handleRemoveItem(id: string) {
    if (!sheet) return;
    if (!canCreateSheet) {
      setPermissionAlert(
        "You do not have permission to modify pull sheets. Ask an owner to update your access."
      );
      return;
    }
    setBlockedIds((prev) => [...new Set([...prev, id])]);
    try {
      await deletePullSheetItem(id);
      refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setBlockedIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  }

  async function moveItem(id: string, delta: number) {
    if (!sheet || items.length === 0) return;
    if (!canCreateSheet) {
      setPermissionAlert(
        "You do not have permission to modify pull sheets. Ask an owner to update your access."
      );
      return;
    }
    const currentIndex = items.findIndex((item) => item.id === id);
    if (currentIndex === -1) return;
    const nextIndex = currentIndex + delta;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const ordered = items.map((item) => item.id);
    [ordered[currentIndex], ordered[nextIndex]] = [ordered[nextIndex], ordered[currentIndex]];
    await reorderPullSheetItems(sheet.id, ordered);
    refetch();
  }

  function resolvedItemName(item: PullSheetItem & { inventory_items?: { name: string | null } | null; products?: { name: string | null } | null }) {
    if (item.item_name) return item.item_name;
    if (item.products?.name) return item.products.name;
    if (item.inventory_items?.name) return item.inventory_items.name;
    return "Unnamed Item";
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-gray-900">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Link href="/app/warehouse" className="hover:text-amber-600">Warehouse</Link>
          <span>/</span>
          <Link href="/app/warehouse/pull-sheets" className="hover:text-amber-600">Pull Sheets</Link>
          {sheet && <span>/ {sheet.code}</span>}
        </div>
        
        <Link
          href="/app/warehouse/pull-sheets"
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 rounded hover:bg-gray-200 border border-gray-300 transition-colors"
        >
          <span>←</span>
          Back to Pull Sheets
        </Link>
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
          Loading pull sheet...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-800">
          {error}
        </div>
      )}

      {permissionAlert && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
          {permissionAlert}
        </div>
      )}

      {!loading && sheet && (
        <div className="space-y-8">
          <section className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow">
            <header className="flex flex-col gap-4 border-b border-gray-200 pb-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{sheet.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-700">
                  <span className="font-mono text-gray-600">{sheet.code}</span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass(sheet.status)}`}>
                    {sheet.status.charAt(0).toUpperCase() + sheet.status.slice(1)}
                  </span>
                  {sheet.jobs && (
                    <Link href={`/app/jobs/${sheet.job_id}`} className="text-amber-600 hover:text-amber-700">
                      Linked job: {sheet.jobs.code ?? sheet.jobs.title ?? sheet.jobs.id}
                    </Link>
                  )}
                </div>
                <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                  <div>
                    <div className="text-gray-500">Scheduled Out</div>
                    <div>{formatDateTime(sheet.scheduled_out_at)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Expected Return</div>
                    <div>{formatDateTime(sheet.expected_return_at)}</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {canCreateSheet && (
                  <button
                    className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:border-amber-500 hover:text-amber-600"
                    onClick={() => setEditHeader((state) => !state)}
                  >
                    {editHeader ? "Cancel" : "Edit Details"}
                  </button>
                )}
                <button
                  className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:border-amber-500 hover:text-amber-600"
                  onClick={() => window.open(`/api/pullsheet?pullSheetId=${sheet.id}`, "_blank")}
                >
                  Generate PDF
                </button>
                {canDeleteSheet && (
                  <button
                    className="rounded border border-red-400 bg-red-50 px-4 py-2 text-red-700 hover:bg-red-100"
                    onClick={() => setDeleteModal(true)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </header>

            {editHeader && (
              <form onSubmit={handleHeaderSave} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wide text-white/40">Pull Sheet Name</label>
                    <input
                      className="w-full rounded-lg border border-white/10 bg-[#0c0d10] px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
                      value={headerForm.name}
                      onChange={(e) => setHeaderForm((prev) => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wide text-white/40">Status</label>
                    <select
                      className="w-full rounded-lg border border-white/10 bg-[#0c0d10] px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
                      value={headerForm.status}
                      onChange={(e) => setHeaderForm((prev) => ({ ...prev, status: e.target.value }))}
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
                      onChange={(e) => setHeaderForm((prev) => ({ ...prev, scheduled_out_at: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wide text-white/40">Expected Return</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-lg border border-white/10 bg-[#0c0d10] px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
                      value={headerForm.expected_return_at}
                      onChange={(e) => setHeaderForm((prev) => ({ ...prev, expected_return_at: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wide text-white/40">Notes</label>
                  <textarea
                    className="w-full rounded-lg border border-white/10 bg-[#0c0d10] px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
                    rows={3}
                    value={headerForm.notes}
                    onChange={(e) => setHeaderForm((prev) => ({ ...prev, notes: e.target.value }))}
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

          <section className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Pull Sheet Items</h2>
                <p className="text-sm text-gray-600">Adjust quantities inline, reorder for workflow, or add new equipment from inventory.</p>
              </div>
              {canCreateSheet && (
                <button
                  className="self-start rounded-lg bg-amber-400 px-4 py-2 font-semibold text-gray-900 hover:bg-amber-300"
                  onClick={() => setAddModalOpen(true)}
                >
                  + Add Item
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
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
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {deleteModal && sheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border-2 border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete pull sheet?</h3>
            <p className="mt-2 text-sm text-gray-600">
              This will remove {sheet.name} and all of its items. This action cannot be undone.
            </p>
            {deleteError && (
              <div className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:border-gray-400"
                onClick={() => {
                  setDeleteModal(false);
                  setDeleteError(null);
                }}
              >
                Cancel
              </button>
              <button
                className="rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
                onClick={handleDeleteSheet}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {addModalOpen && sheet && (
        <AddItemModal
          onClose={() => setAddModalOpen(false)}
          onAdd={async (payload) => {
            await handleAddItem(payload);
            setAddModalOpen(false);
          }}
        />
      )}
    </main>
  );
}

function AddItemModal({ onClose, onAdd }: { onClose: () => void; onAdd: (payload: AddItemPayload) => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<InventoryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<InventoryResult | null>(null);
  const [customName, setCustomName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timeout = setTimeout(async () => {
      if (!search.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, barcode, gear_type")
        .or(
          `name.ilike.%${search.trim()}%,barcode.ilike.%${search.trim()}%`
        )
        .order("name", { ascending: true })
        .limit(25);
      if (!active) return;
      if (error) {
        setError(error.message);
        setResults([]);
      } else {
        setError(null);
        const typed = (data ?? []) as Array<{ id: string; name: string | null; barcode: string | null; gear_type: string | null }>;
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
    }, 250);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [search]);

  function resetSelection() {
    setSelected(null);
    setCustomName("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (quantity <= 0) {
      setError("Quantity must be greater than zero");
      return;
    }
    const itemName = selected?.name ?? customName.trim();
    if (!itemName) {
      setError("Select an inventory item or provide a custom name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onAdd({
        inventory_item_id: selected?.id ?? null,
        item_name: itemName,
        qty_requested: quantity,
        notes: notes.trim() || null,
      });
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xl rounded-xl border-2 border-gray-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Add pull sheet item</h3>
          <button
            type="button"
            className="text-gray-600 hover:text-gray-900"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-gray-500">Search Inventory</label>
            <input
              className="w-full rounded border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-amber-400 focus:outline-none"
              placeholder="Scan or search by name / barcode"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              onFocus={() => setSearch("")}
            />
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50">
              {loading ? (
                <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
              ) : results.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No inventory matches.</div>
              ) : (
                results.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${selected?.id === result.id ? "bg-amber-100 text-amber-900" : "hover:bg-gray-100 text-gray-900"}`}
                    onClick={() => {
                      setSelected(result);
                      setCustomName(result.name);
                    }}
                  >
                    <span>{result.name}</span>
                    <span className="text-xs text-gray-500">{result.barcode ?? ""}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-gray-500">Or enter custom name</label>
            <input
              className="w-full rounded border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-amber-400 focus:outline-none"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-gray-500">Quantity</label>
              <input
                type="number"
                min={1}
                className="w-full rounded border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-amber-400 focus:outline-none"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-gray-500">Notes</label>
              <input
                className="w-full rounded border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-amber-400 focus:outline-none"
                placeholder="Optional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:border-gray-400"
            onClick={() => {
              resetSelection();
              setNotes("");
              setQuantity(1);
              onClose();
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded bg-amber-400 px-4 py-2 font-semibold text-gray-900 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? "Adding…" : "Add Item"}
          </button>
        </div>
      </form>
    </div>
  );
}
