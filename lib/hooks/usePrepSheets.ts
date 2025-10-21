import { useAsync } from "./useSupabase";
import { supabase, Tables, TablesInsert, TablesUpdate } from "../supabaseClient";
import { guard } from "./useSupabase";

export function usePrepSheet(prepSheetId: string) {
  return useAsync<Tables<"prep_sheets"> & {
    prep_sheet_items: Array<Tables<"prep_sheet_items"> & {
      inventory_items: Pick<Tables<"inventory_items">, "name" | "barcode">;
    }>;
  }>(async () => {
    const res = await supabase
      .from("prep_sheets")
      .select(`*, prep_sheet_items(*, inventory_items(name, barcode))`)
      .eq("id", prepSheetId)
      .single();
    return guard(res);
  }, [prepSheetId]);
}

export async function addItemToPrepSheet(
  prepSheetId: string,
  itemId: string,
  requiredQty: number
) {
  // Upsert line
  const res = await supabase
    .from("prep_sheet_items")
    .upsert([
      {
        prep_sheet_id: prepSheetId,
        inventory_item_id: itemId,
        required_qty: requiredQty,
        picked_qty: 0,
        created_at: new Date().toISOString(),
      } as TablesInsert<"prep_sheet_items">,
    ], { onConflict: "prep_sheet_id,inventory_item_id" });
  return guard(res);
}

export async function scanToPick(
  prepSheetId: string,
  barcode: string,
  qty: number = 1,
  sounds?: { onSuccess?: () => void; onFail?: () => void }
) {
  // Find inventory item by barcode
  const itemRes = await supabase
    .from("inventory_items")
    .select("id")
    .eq("barcode", barcode)
    .single();
  const item = guard(itemRes);
  if (!item) {
    sounds?.onFail?.();
    throw new Error("Item not found");
  }
  // Find prep_sheet_item
  const psiRes = await supabase
    .from("prep_sheet_items")
    .select("id, picked_qty, required_qty")
    .eq("prep_sheet_id", prepSheetId)
    .eq("inventory_item_id", item.id)
    .single();
  const psi = guard(psiRes);
  if (!psi) {
    sounds?.onFail?.();
    throw new Error("Prep sheet item not found");
  }
  // Calculate new picked_qty
  const newPicked = Math.min((psi.picked_qty ?? 0) + qty, psi.required_qty ?? qty);
  // Update picked_qty
  const updateRes = await supabase
    .from("prep_sheet_items")
    .update({ picked_qty: newPicked } as TablesUpdate<"prep_sheet_items">)
    .eq("id", psi.id);
  if (updateRes.error) {
    sounds?.onFail?.();
    throw updateRes.error;
  }
  // Record inventory_movements
  const moveRes = await supabase
    .from("inventory_movements")
    .insert([
      {
        inventory_item_id: item.id,
        qty: qty,
        created_at: new Date().toISOString(),
      } as TablesInsert<"inventory_movements">,
    ]);
  if (moveRes.error) {
    sounds?.onFail?.();
    throw moveRes.error;
  }
  sounds?.onSuccess?.();
  return { picked_qty: newPicked };
}

export async function completePrepSheet(prepSheetId: string) {
  // Get all prep_sheet_items for this sheet
  const itemsRes = await supabase
    .from("prep_sheet_items")
    .select("picked_qty, required_qty")
    .eq("prep_sheet_id", prepSheetId);
  const items = guard(itemsRes);
  if (!items || items.length === 0) throw new Error("No items");
  // Check if all picked_qty >= required_qty
  const allPicked = items.every(
    (i: { picked_qty?: number; required_qty?: number }) => (i.picked_qty ?? 0) >= (i.required_qty ?? 0)
  );
  if (!allPicked) throw new Error("Not all items picked");
  // Set status to complete
  const updateRes = await supabase
    .from("prep_sheets")
    .update({ status: "complete" } as TablesUpdate<"prep_sheets">)
    .eq("id", prepSheetId);
  if (updateRes.error) throw updateRes.error;
  return true;
}
