import { useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { guard, useAsync } from "./useSupabase";
import type { Database } from "@/types/database";

export type JobRow = Database["public"]["Tables"]["jobs"]["Row"] & {
  client_name: string | null | undefined;
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
      .select("*")
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
    if (error || !data) throw error || new Error("Failed to fetch jobs");
    const jobs = data as Database["public"]["Tables"]["jobs"]["Row"][];
    // Map client name from the client field
    return jobs.map((j) => ({
      ...j,
      client_name: j.client ?? null,
    }));
  }, [params?.search, params?.status]);
}

export async function createJob(
  input: Database["public"]["Tables"]["jobs"]["Insert"]
): Promise<JobRow> {
  const { data, error } = await supabase
    .from("jobs")
    .insert([input])
    .select("*")
    .single();
  if (error || !data) throw error || new Error("Failed to create job");
  const jobData = data as Database["public"]["Tables"]["jobs"]["Row"];
  return {
    ...jobData,
    client_name: jobData.client ?? null,
  };
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
        .select("*")
        .eq("id", jobId)
        .single();
      if (jobError || !job) throw jobError || new Error("Failed to fetch job");
      const jobData = job as Database["public"]["Tables"]["jobs"]["Row"];
      const jobWithClient: JobRow = {
        ...jobData,
        client_name: jobData.client ?? null,
      };

      // 2. Ensure prep_sheet exists
      const { data: prepSheet, error: prepSheetError } = await supabase
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
        return {
          job: jobWithClient,
          prepSheet: created,
          returnManifest: null,
          transports: [],
        };
      }

      // 3. Ensure return_manifest exists
      const { data: returnManifest, error: returnManifestError } = await supabase
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
        return {
          job: jobWithClient,
          prepSheet,
          returnManifest: created,
          transports: [],
        };
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
