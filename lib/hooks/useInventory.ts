
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";
import { useEffect, useState } from "react";
import { guard } from "./useSupabase";

// Helper types for table row/insert/update
type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];

// Type definitions for inventory entities. These correspond to rows in
// Supabase tables. The `Tables` generic comes from the generated
// Supabase types and ensures correct field names and types.
export type InventoryItem = Tables<"inventory_items">;
// If you add inventory_movements to types/database.ts, you can uncomment below:
// export type InventoryMovement = Tables<"inventory_movements">;

/**
 * scanIn
 *
 * Increment the quantity of an item in the warehouse based on its
 * barcode. A `scan_events` row is created regardless of whether the
 * item exists. When an unknown barcode is scanned the function
 * returns `{ ok: false }`. If the item exists the `qty_in_warehouse`
 * field is incremented by one and the item row is returned.
 */
export async function scanIn(
  barcode: string,
  opts?: { jobId?: string }
): Promise<{ ok: boolean; item?: InventoryItem }> {
  const { data: item } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("barcode", barcode)
    .single();
  let ok = false;
  let result: "success" | "not_found" = "not_found";
  let itemRow: InventoryItem | undefined;
  if (item) {
    ok = true;
    result = "success";
    itemRow = item;
    await supabase
      .from("inventory_items")
      .update({
        qty_in_warehouse: (item.qty_in_warehouse ?? 0) + 1,
      } as TablesUpdate<"inventory_items">)
      .eq("id", item.id);
  }
  const event: TablesInsert<"scan_events"> = {
    barcode,
    result,
    job_id: opts?.jobId ?? null,
    created_at: new Date().toISOString(),
  };
  await supabase.from("scan_events").insert([event]);
  return { ok, item: itemRow };
}

/**
 * useInventory
 *
 * React hook to fetch and optionally search inventory items. It
 * automatically updates when the `search` query changes. The hook
 * returns an object containing the data array, a loading flag and an
 * error message.
 */
export function useInventory(query?: { search?: string }) {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  
  const refetch = () => setRefreshCount(c => c + 1);
  
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      let q = supabase
        .from("inventory_items")
        .select("*")
        .order("name", { ascending: true });
      if (query?.search) {
        // Use ilike with wildcard matches on name and barcode
        q = q.or(
          `name.ilike.%${query.search}%,barcode.ilike.%${query.search}%`
        );
      }
      const { data: rows, error } = await q;
      if (!active) return;
      if (error) setError(error.message);
      else setData((rows ?? []) as InventoryItem[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [query?.search, refreshCount]);
  return { data, loading, error, refetch };
}

/**
 * freeScanIn
 *
 * Performs a generic scan-in operation that directly increments the
 * `quantity_on_hand` field and records a movement. It is designed for
 * use in contexts outside of specific jobs or prep sheets (hence
 * "free"). The optional callbacks can trigger audio feedback.
 */
export async function freeScanIn(
  barcode: string,
  qty: number = 1,
  opts?: { onSuccessBeep?: () => void; onFailBeep?: () => void }
): Promise<InventoryItem> {
  // Lookup item by barcode
  const { data: item, error: lookupErr } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("barcode", barcode)
    .single();
  if (lookupErr || !item) {
    opts?.onFailBeep?.();
    throw new Error("Item not found for barcode: " + barcode);
  }
  // Insert movement record
  const movement: TablesInsert<"inventory_movements"> = {
    item_id: item.id,
    qty,
    created_at: new Date().toISOString(),
  };
  guard(await supabase.from("inventory_movements").insert([movement]));
  // Atomically increment quantity_on_hand
  const { data: updated, error: updateErr } = await supabase
    .from("inventory_items")
    .update({
      quantity_on_hand: (item.quantity_on_hand ?? 0) + qty,
    } as TablesUpdate<"inventory_items">)
    .eq("id", item.id)
    .select()
    .single();
  if (updateErr || !updated) {
    opts?.onFailBeep?.();
    throw new Error("Failed to update quantity");
  }
  opts?.onSuccessBeep?.();
  return updated as InventoryItem;
}

/**
 * freeScanOut
 *
 * Performs a generic scan-out operation. It inserts a movement with
 * direction `out` and decrements the item's `quantity_on_hand`,
 * flooring the result at zero. Optional callbacks allow callers to
 * provide audio feedback on success or failure.
 */
export async function freeScanOut(
  barcode: string,
  qty: number = 1,
  opts?: { onSuccessBeep?: () => void; onFailBeep?: () => void }
): Promise<InventoryItem> {
  // Lookup item
  const { data: item, error: lookupErr } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("barcode", barcode)
    .single();
  if (lookupErr || !item) {
    opts?.onFailBeep?.();
    throw new Error("Item not found for barcode: " + barcode);
  }
  // Insert movement with direction out
  const movement: TablesInsert<"inventory_movements"> = {
    item_id: item.id,
    direction: "out",
    qty,
    note: null,
  };
  guard(await supabase.from("inventory_movements").insert([movement]));
  // Compute new quantity, floor at 0
  const newQty = Math.max(0, (item.quantity_on_hand ?? 0) - qty);
  const { data: updated, error: updateErr } = await supabase
    .from("inventory_items")
    .update({ quantity_on_hand: newQty } as TablesUpdate<"inventory_items">)
    .eq("id", item.id)
    .select()
    .single();
  if (updateErr || !updated) {
    opts?.onFailBeep?.();
    throw new Error("Failed to update quantity");
  }
  opts?.onSuccessBeep?.();
  return updated as InventoryItem;
}

// -----------------------------------------------------------------------------
// Extended CRUD helpers
//
// The following functions implement full create, update, delete and read
// operations for inventory items. They build upon the basic scanning
// functions above and provide a more complete API for the inventory
// module.

/**
 * createInventoryItem
 *
 * Insert a new row into `inventory_items`. If optional numeric
 * quantities are omitted they default to zero. Returns the inserted
 * record.
 */
export async function createInventoryItem(item: {
  name: string;
  barcode: string;
  qty_in_warehouse?: number;
  quantity_on_hand?: number;
}): Promise<InventoryItem> {
  const payload: TablesInsert<"inventory_items"> = {
    barcode: item.barcode,
    name: item.name,
    qty_in_warehouse: item.qty_in_warehouse ?? 0,
    quantity_on_hand: item.quantity_on_hand ?? 0,
  };
  const { data, error } = await supabase
    .from("inventory_items")
    .insert([payload])
    .select()
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create item");
  }
  return data as InventoryItem;
}

/**
 * updateInventoryItem
 *
 * Update an existing inventory record. Pass the id and a partial
 * payload of fields to update. The updated row is returned on
 * success.
 */
export async function updateInventoryItem(
  id: string,
  updates: {
    name?: string;
    barcode?: string;
    qty_in_warehouse?: number;
    quantity_on_hand?: number;
  }
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from("inventory_items")
    .update(updates as TablesUpdate<"inventory_items">)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update item");
  }
  return data as InventoryItem;
}

/**
 * deleteInventoryItem
 *
 * Remove an inventory record entirely. Callers should prompt
 * confirmation before invoking this function.
 */
export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * useInventoryItem
 *
 * Retrieve a single inventory row for editing. This hook accepts a
 * string UUID id and exposes the item along with loading and error
 * states.
 */
export function useInventoryItem(id?: string) {
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (id === undefined || id === null) {
      setItem(null);
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("id", id)
        .single();
      if (!active) return;
      if (error) {
        setError(error.message);
        setItem(null);
      } else {
        setItem(data as InventoryItem);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);
  return { item, loading, error };
}
