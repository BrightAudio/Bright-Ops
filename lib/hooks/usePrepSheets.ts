// @ts-nocheck
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
        item_id: item.id,
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

export async function finalizePrepSheetByJob(jobId: string) {
  console.log('🚀 finalizePrepSheetByJob START - Job ID:', jobId);
  
  try {
    // Find the prep_sheet for this job (use latest one if multiple exist)
    const prepRes = await supabase
      .from('prep_sheets')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    console.log('📋 Prep sheet query result:', prepRes);
    
    if (prepRes.error) {
      console.error('Error fetching prep sheet:', prepRes.error);
      throw new Error(`Failed to fetch prep sheet: ${prepRes.error.message}`);
    }
    
    const prep = prepRes.data && prepRes.data.length > 0 ? prepRes.data[0] : null;
    if (!prep) throw new Error('Prep sheet not found for job');

    console.log('✅ Found prep sheet:', prep.id);

    // Load prep items
    const itemsRes = await supabase
      .from('prep_sheet_items')
      .select('id, inventory_item_id, item_name, qty_requested, qty_picked, inventory_items(name)')
      .eq('prep_sheet_id', prep.id);
    
    if (itemsRes.error) {
      console.error('Error fetching prep items:', itemsRes.error);
      throw new Error(`Failed to fetch prep items: ${itemsRes.error.message}`);
    }
    
    const items = itemsRes.data || [];

    // Load job information
    const { data: jobData, error: jobErr } = await supabase
      .from('jobs')
      .select('id, code, title, start_at, end_at, notes')
      .eq('id', jobId)
      .maybeSingle();
    
    if (jobErr) {
      console.error('Error fetching job:', jobErr);
      throw new Error(`Failed to fetch job: ${jobErr.message}`);
    }

    const pullName = `${(jobData as any)?.code ?? (jobData as any)?.title ?? 'Pull Sheet'}`;

    // Create pull sheet
    const { data: createdPull, error: createErr } = await supabase
      .from('pull_sheets')
      .insert([{
        name: pullName,
        job_id: jobId,
        status: 'active',  // Set to active so scanning works immediately
        scheduled_out_at: (jobData as any)?.start_at ?? null,
        expected_return_at: (jobData as any)?.end_at ?? null,
        notes: (jobData as any)?.notes ?? null,
      }])
      .select()
      .maybeSingle();

    if (createErr) {
      console.error('Error creating pull sheet:', createErr);
      throw new Error(`Failed to create pull sheet: ${createErr.message}`);
    }
    
    if (!createdPull) throw new Error('Failed to create pull sheet - no data returned');

    // Insert pull sheet items
    const itemsToInsert = [] as any[];
    for (const it of items) {
      const qty = (it.qty_requested ?? 0);
      // Use item_name if available (for potential items), otherwise get from join
      const itemName = it.item_name || (it as any).inventory_items?.name || 'Unknown Item';
      itemsToInsert.push({
        pull_sheet_id: createdPull.id,
        inventory_item_id: it.inventory_item_id || null,
        item_name: itemName,
        qty_requested: qty,
        qty_pulled: 0,
        sort_index: 0,
      });
    }

    console.log('=== CREATE PULL SHEET DEBUG ===');
    console.log('Prep sheet items count:', items.length);
    console.log('Items to insert:', itemsToInsert);
    console.log('Pull sheet ID:', createdPull.id);
    console.log('==============================');

    if (itemsToInsert.length > 0) {
      const { error: itemsErr } = await supabase
        .from('pull_sheet_items')
        .insert(itemsToInsert as any[]);
      
      if (itemsErr) {
        console.error('Error inserting pull sheet items:', itemsErr);
        throw new Error(`Failed to insert pull sheet items: ${itemsErr.message}`);
      } else {
        console.log('✅ Successfully inserted', itemsToInsert.length, 'pull sheet items');
      }
    } else {
      console.warn('⚠️ No items to insert into pull sheet!');
    }

    return createdPull as any;
  } catch (error) {
    console.error('finalizePrepSheetByJob error:', error);
    throw error;
  }
}
