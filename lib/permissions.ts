import { supabaseServer } from "./supabaseServer";

export type PullsheetPermissions = {
  role: "owner" | "admin" | "crew" | null;
  can_create_pullsheets: boolean | null;
  can_delete_pullsheets: boolean | null;
  can_finalize_pullsheets: boolean | null;
} | null;

export async function getPullsheetPermissions(): Promise<PullsheetPermissions> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("home_base_members")
    .select(
      "role, can_create_pullsheets, can_delete_pullsheets, can_finalize_pullsheets"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  return (data as PullsheetPermissions) ?? null;
}
