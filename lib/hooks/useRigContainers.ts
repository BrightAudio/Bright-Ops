import { useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAsync } from "./useSupabase";

export type RigContainer = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  barcode: string | null;
  created_at: string;
  updated_at: string;
};

export type RigContainerItem = {
  id: string;
  rig_container_id: string;
  inventory_item_id: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  inventory_items?: {
    name: string;
    barcode: string;
    image_url?: string;
  };
};

export type RigContainerWithItems = RigContainer & {
  items: RigContainerItem[];
};

export function useRigContainers() {
  return useAsync<RigContainer[]>(async () => {
    const { data, error } = await supabase
      .from("rig_containers")
      .select("*")
      .order("name", { ascending: true });
    
    if (error) throw error;
    return data as RigContainer[];
  }, []);
}

export function useRigContainer(id?: string) {
  return useAsync<RigContainerWithItems | null>(
    useCallback(async () => {
      if (!id) return null;
      
      const { data: rig, error: rigError } = await supabase
        .from("rig_containers")
        .select("*")
        .eq("id", id)
        .single();
      
      if (rigError) throw rigError;
      
      const { data: items, error: itemsError } = await supabase
        .from("rig_container_items")
        .select(`
          *,
          inventory_items:inventory_item_id (
            name,
            barcode,
            image_url
          )
        `)
        .eq("rig_container_id", id);
      
      if (itemsError) throw itemsError;
      
      return {
        ...(rig as any),
        items: items || [],
      } as RigContainerWithItems;
    }, [id]),
    [id]
  );
}

export async function createRigContainer(input: {
  name: string;
  description?: string;
  category?: string;
}): Promise<RigContainer> {
  const { data, error } = await supabase
    .from("rig_containers")
    .insert([{
      name: input.name,
      description: input.description || null,
      category: input.category || null,
    }] as any)
    .select("*")
    .single();
  
  if (error) throw error;
  return data as RigContainer;
}

export async function updateRigContainer(
  id: string,
  input: Partial<{
    name: string;
    description: string;
    category: string;
  }>
): Promise<void> {
  const { error } = await (supabase as any)
    .from("rig_containers")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  
  if (error) throw error;
}

export async function deleteRigContainer(id: string): Promise<void> {
  const { error } = await supabase
    .from("rig_containers")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

export async function addItemToRig(input: {
  rig_container_id: string;
  inventory_item_id: string;
  quantity: number;
  notes?: string;
}): Promise<RigContainerItem> {
  const { data, error } = await supabase
    .from("rig_container_items")
    .insert([{
      rig_container_id: input.rig_container_id,
      inventory_item_id: input.inventory_item_id,
      quantity: input.quantity,
      notes: input.notes || null,
    }] as any)
    .select("*")
    .single();
  
  if (error) throw error;
  return data as RigContainerItem;
}

export async function updateRigItem(
  id: string,
  input: Partial<{
    quantity: number;
    notes: string;
  }>
): Promise<void> {
  const { error } = await (supabase as any)
    .from("rig_container_items")
    .update(input)
    .eq("id", id);
  
  if (error) throw error;
}

export async function removeItemFromRig(id: string): Promise<void> {
  const { error } = await supabase
    .from("rig_container_items")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}
