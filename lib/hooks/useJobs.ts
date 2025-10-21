import { useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { guard, useAsync } from "./useSupabase";
import type { Database } from "@/types/database";

export type JobRow = Database["public"]["Tables"]["jobs"]["Row"] & {
  client_name: string | null;
};
export type PrepSheetRow = Database["public"]["Tables"]["prep_sheets"]["Row"];
export type ReturnManifestRow = Database["public"]["Tables"]["return_manifest"]["Row"];
export type TransportRow = Database["public"]["Tables"]["transports"]["Row"];

export function useJobs(params?: {
  search?: string;
  status?: Database["public"]["Enums"]["job_status"] | "all";
}) {
  return useAsync<JobRow[]>(async () => {
    let query = supabase
      .from("jobs")
      .select("*, clients(name)")
      .order("created_at", { ascending: false });
    if (params?.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }
    if (params?.search) {
      query = query.or(
        `code.ilike.%${params.search}%,title.ilike.%${params.search}%`
      );
    }
    const { data, error } = await query;
    const jobs = guard(data ? { data, error } : { data: null, error });
    // Map client name
    return jobs.map((j: any) => ({
      ...j,
      client_name: j.clients?.name ?? null,
    }));
  }, [params?.search, params?.status]);
}

export async function createJob(
  input: Database["public"]["Tables"]["jobs"]["Insert"]
): Promise<JobRow> {
  const { data, error } = await supabase
    .from("jobs")
    .insert([input as Database["public"]["Tables"]["jobs"]["Insert"]])
    .select("*, clients(name)")
    .single();
  const job = guard(data ? { data, error } : { data: null, error });
  return job
    ? { ...job, client_name: job.clients?.name ?? null }
    : { id: '', code: '', title: '', status: 'draft', client: '', created_at: null, client_name: null };
}

export function useJobWithLinks(jobId: string) {
  return useAsync<{
    job: JobRow | null;
    prepSheet: PrepSheetRow | null;
    returnManifest: ReturnManifestRow | null;
    transports: TransportRow[];
  }>(
    useCallback(async () => {
      // 1. Fetch job with client name
      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .select("*, clients(name)")
        .eq("id", jobId)
        .single();
      guard({ data: job, error: jobError });
      const jobWithClient: JobRow = job
        ? { ...job, client_name: job.clients?.name ?? null }
        : { id: '', code: '', title: '', status: 'draft', client: '', created_at: null, client_name: null };

      // 2. Ensure prep_sheet exists
      let { data: prepSheet, error: prepSheetError } = await supabase
        .from("prep_sheets")
        .select("*")
        .eq("job_id", jobId)
        .single();
      if (prepSheetError || !prepSheet) {
        const { data: created, error: createErr } = await supabase
          .from("prep_sheets")
          .insert([{ job_id: jobId, status: "draft", created_at: new Date().toISOString() } as Database["public"]["Tables"]["prep_sheets"]["Insert"]])
          .select()
          .single();
        guard({ data: created, error: createErr });
        prepSheet = created;
      }

      // 3. Ensure return_manifest exists
      let { data: returnManifest, error: returnManifestError } = await supabase
        .from("return_manifest")
        .select("*")
        .eq("job_id", jobId)
        .single();
      if (returnManifestError || !returnManifest) {
          const { data: created, error: createErr } = await supabase
            .from("return_manifest")
            .insert([{ job_id: jobId, status: "open", created_at: new Date().toISOString() } as Database["public"]["Tables"]["return_manifest"]["Insert"]])
            .select()
            .single();
        guard({ data: created, error: createErr });
        returnManifest = created;
      }

      // 4. Fetch transports
      const { data: transports, error: transportsError } = await supabase
        .from("transports")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      guard({ data: transports, error: transportsError });

      return {
        job: jobWithClient,
        prepSheet,
        returnManifest,
        transports: transports ?? [],
      };
    }, [jobId]),
    [jobId]
  );
}
