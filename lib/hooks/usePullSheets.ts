import { useEffect, useState } from "react";
import { supabase, TablesInsert, TablesUpdate } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";

// Convenience table helpers
export type PullSheet = Database["public"]["Tables"]["pull_sheets"]["Row"];
export type PullSheetInsert = Database["public"]["Tables"]["pull_sheets"]["Insert"];
export type PullSheetUpdate = Database["public"]["Tables"]["pull_sheets"]["Update"];
export type PullSheetItem = Database["public"]["Tables"]["pull_sheet_items"]["Row"];
export type PullSheetItemInsert = Database["public"]["Tables"]["pull_sheet_items"]["Insert"];
export type PullSheetItemUpdate = Database["public"]["Tables"]["pull_sheet_items"]["Update"];

export type PullSheetWithJob = PullSheet & {
  jobs: {
    id: string;
    code: string | null;
    title: string | null;
  } | null;
};

export type PullSheetDetail = {
  sheet: PullSheetWithJob | null;
  items: Array<
    PullSheetItem & {
      inventory_items?: {
        id: string;
        name: string | null;
        barcode: string | null;
      } | null;
      products?: {
        id: string;
        name: string | null;
        sku: string | null;
      } | null;
    }
  >;
};

export function usePullSheets() {
  const [pullSheets, setPullSheets] = useState<PullSheetWithJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refetch = () => setRefreshToken((token) => token + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("pull_sheets")
        .select(
          `*,
          jobs ( id, code, title )
        `
        )
        .not("job_id", "is", null)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        setError(error.message);
        setPullSheets([]);
      } else {
        setPullSheets((data ?? []) as PullSheetWithJob[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  return { data: pullSheets, loading, error, refetch };
}

export function usePullSheet(id?: string) {
  const [detail, setDetail] = useState<PullSheetDetail>({ sheet: null, items: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refetch = () => setRefreshToken((token) => token + 1);

  useEffect(() => {
    if (!id) {
      setDetail({ sheet: null, items: [] });
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      const [sheetRes, itemRes] = await Promise.all([
        supabase
          .from("pull_sheets")
          .select(
            `*,
            jobs ( id, code, title )
          `
          )
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("pull_sheet_items")
          .select(
            `*,
            inventory_items ( id, name, barcode ),
            products ( id, name, sku )
          `
          )
          .eq("pull_sheet_id", id)
          .order("sort_index", { ascending: true })
          .order("created_at", { ascending: true })
      ]);

      if (cancelled) return;

      if (sheetRes.error) {
        setError(sheetRes.error.message);
        setDetail({ sheet: null, items: [] });
        setLoading(false);
        return;
      }
      if (itemRes.error) {
        setError(itemRes.error.message);
        setDetail({ sheet: (sheetRes.data as PullSheetWithJob | null) ?? null, items: [] });
        setLoading(false);
        return;
      }

      setDetail({
        sheet: (sheetRes.data as PullSheetWithJob | null) ?? null,
        items: (itemRes.data ?? []) as PullSheetDetail["items"],
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, refreshToken]);

  return { ...detail, loading, error, refetch };
}

export async function createPullSheet(payload: PullSheetInsert) {
  const { data, error } = await supabase
    .from("pull_sheets")
    .insert([payload as TablesInsert<"pull_sheets">] as any)
    .select()
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create pull sheet");
  }
  return data as PullSheet;
}

export async function updatePullSheet(id: string, updates: PullSheetUpdate) {
  const { data, error } = await (supabase
    .from("pull_sheets")
    .update(updates as TablesUpdate<"pull_sheets">) as any)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update pull sheet");
  }
  
  // If updating dates or status, sync with the job
  if (updates.scheduled_out_at || updates.expected_return_at || updates.status) {
    const pullSheet = data as PullSheet;
    if (pullSheet.job_id) {
      const jobUpdates: any = {};
      
      // Sync dates
      if (updates.scheduled_out_at !== undefined) {
        jobUpdates.start_at = updates.scheduled_out_at;
      }
      if (updates.expected_return_at !== undefined) {
        jobUpdates.end_at = updates.expected_return_at;
      }
      
      // Update job status based on pull sheet status
      if (updates.status) {
        if (updates.status === 'finalized') {
          jobUpdates.status = 'active'; // Job is in progress
        } else if (updates.status === 'picking') {
          jobUpdates.status = 'active'; // Job is being prepared
        } else if (updates.status === 'draft') {
          jobUpdates.status = 'draft'; // Job is still being planned
        }
      }
      
      // Only update if there are changes
      if (Object.keys(jobUpdates).length > 0) {
        await supabase
          .from("jobs")
          .update(jobUpdates as any)
          .eq("id", pullSheet.job_id);
      }
    }
  }
  
  return data as PullSheet;
}

export async function deletePullSheet(id: string) {
  const { error } = await supabase.from("pull_sheets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addPullSheetItem(payload: PullSheetItemInsert & { sort_index?: number }) {
  const { data, error } = await (supabase
    .from("pull_sheet_items")
    .insert([payload as TablesInsert<"pull_sheet_items">]) as any)
    .select()
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to add item");
  }
  return data as PullSheetItem;
}

export async function updatePullSheetItem(id: string, updates: PullSheetItemUpdate) {
  const { data, error } = await (supabase
    .from("pull_sheet_items")
    .update(updates as TablesUpdate<"pull_sheet_items">) as any)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update item");
  }
  return data as PullSheetItem;
}

export async function deletePullSheetItem(id: string) {
  const { error } = await supabase.from("pull_sheet_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderPullSheetItems(
  pullSheetId: string,
  orderedIds: string[]
) {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("pull_sheet_items")
        .update({ sort_index: index * 100 } as TablesUpdate<"pull_sheet_items"> as any)
        .eq("id", id)
    )
  );
}
