// BACKUP: Original file before patch
import { supabase, Tables, TablesInsert, TablesUpdate } from "@/lib/supabaseClient";

// ...existing code...
export async function scanIn(barcode: string, opts?: { jobId?: string }) {
  const { data: item, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("barcode", barcode)
    .single();

  let ok = false;
  let result = "not_found";
  let itemRow: Tables<"inventory_items"> | undefined = undefined;

  if (item) {
    ok = true;
    result = "success";
    itemRow = item;
    await supabase
      .from("inventory_items")
  .update({ qty_in_warehouse: (item.qty_in_warehouse ?? 0) + 1 } as any)
      .eq("id", item.id);
  }

  const event = {
    barcode,
    result,
    job_id: opts?.jobId ?? null,
    created_at: new Date().toISOString(),
  } as any;
  await supabase.from("scan_events").insert([event]);

  return { ok, item: itemRow };
}
import { useEffect, useState } from "react";
import { guard } from "./useSupabase";

export type InventoryItem = Tables<"inventory_items">;
export type InventoryMovement = Tables<"inventory_movements">;

export function useInventory(query?: { search?: string }) {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        q = q.or(
          `name.ilike.%${query.search}%,barcode.ilike.%${query.search}%`
        );
      }
      const { data, error } = await q;
      if (!active) return;
      if (error) setError(error.message);
      else setData((data ?? []) as InventoryItem[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [query?.search]);

  return { data, loading, error };
}

export async function freeScanIn(
  barcode: string,
  qty: number = 1,
  opts?: { onSuccessBeep?: () => void; onFailBeep?: () => void }
): Promise<InventoryItem> {
  // Lookup item
  const { data: item, error: lookupErr } = await supabase
