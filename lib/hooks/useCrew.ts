import { useAsync } from "./useSupabase";
import { supabase, Tables, TablesInsert } from "../supabaseClient";
import { guard } from "./useSupabase";

export function useCrew(jobId: string) {
  return useAsync<Array<Tables<"crew_shifts">>>(async () => {
    const res = await supabase
      .from("crew_shifts")
      .select("*")
      .eq("job_id", jobId);
    return guard(res);
  }, [jobId]);
}

export async function scheduleCrew(input: TablesInsert<"crew_shifts">) {
  const res = await supabase
    .from("crew_shifts")
    .insert([input]);
  return guard(res);
}
