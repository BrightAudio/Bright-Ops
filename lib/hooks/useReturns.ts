import { useAsync } from "./useSupabase";
import { supabase, Tables, TablesInsert, TablesUpdate } from "../supabaseClient";
import { guard } from "./useSupabase";

export function useReturnManifest(jobId: string) {
  return useAsync<Tables<"return_manifest"> & {
    return_manifest_items: Array<Tables<"return_manifest_items">>;
  }>(async () => {
    const res = await supabase
      .from("return_manifest")
      .select("*, return_manifest_items(*)")
      .eq("job_id", jobId)
      .single();
    return guard(res);
  }, [jobId]);
}

export async function recordReturn(
  manifestId: string,
  barcode: string,
  qty: number = 1
) {
  // Find inventory item by barcode
  const itemRes = await supabase
    .from("inventory_items")
    .select("id")
    .eq("barcode", barcode)
    .single();
  const item = guard(itemRes);
  if (!item) throw new Error("Item not found");
  // Find manifest item line
  const lineRes = await supabase
    .from("return_manifest_items")
    .select("id, returned_qty")
    .eq("return_manifest_id", manifestId)
    .eq("inventory_item_id", item.id)
    .single();
  let newQty = qty;
  if (lineRes.data) {
    // Increment returned_qty
    newQty = (lineRes.data.returned_qty ?? 0) + qty;
    const updateRes = await supabase
      .from("return_manifest_items")
      .update({ returned_qty: newQty } as TablesUpdate<"return_manifest_items">)
      .eq("id", lineRes.data.id);
    if (updateRes.error) throw updateRes.error;
  } else {
    // Insert new line
    const insertRes = await supabase
      .from("return_manifest_items")
      .insert([
        {
          return_manifest_id: manifestId,
          inventory_item_id: item.id,
          returned_qty: qty,
        } as TablesInsert<"return_manifest_items">,
      ]);
    if (insertRes.error) throw insertRes.error;
  }
  // Record inventory_movements
  const moveRes = await supabase
    .from("inventory_movements")
    .insert([
      {
        inventory_item_id: item.id,
        qty,
        direction: "in",
        context: `return_manifest:${manifestId}`,
      } as TablesInsert<"inventory_movements">,
    ]);
  if (moveRes.error) throw moveRes.error;
  return true;
}
