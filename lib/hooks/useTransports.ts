import { useAsync } from "./useSupabase";
import { supabase, Tables, TablesInsert } from "../supabaseClient";
import { guard } from "./useSupabase";

export function useTransports(jobId: string) {
  return useAsync<Array<Tables<"transports">>>(async () => {
    const res = await supabase
      .from("transports")
      .select("*")
      .eq("job_id", jobId);
    return guard(res);
  }, [jobId]);
}

export async function createTransport(input: TablesInsert<"transports">) {
  const res = await supabase
    .from("transports")
    .insert([input]);
  return guard(res);
}
