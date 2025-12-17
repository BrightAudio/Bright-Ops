import { redirect } from "next/navigation";
import HomeBaseTeam from "../../../../components/homebase/HomeBaseTeam";
import { supabaseServer } from "@/lib/supabaseServer";

type OwnerMembership = {
  home_base_id: string;
  role: "owner" | "admin" | "crew" | null;
  can_create_pullsheets: boolean;
  can_delete_pullsheets: boolean;
  can_finalize_pullsheets: boolean;
};

type TeamMember = {
  user_id: string;
  role: "owner" | "admin" | "crew";
  can_create_pullsheets: boolean;
  can_delete_pullsheets: boolean;
  can_finalize_pullsheets: boolean;
  profiles: { full_name: string | null; email: string | null } | null;
};

export default async function HomeBaseSettingsPage() {
  const supabase = await supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/auth/login");

  const membershipResponse = await supabase
    .from("home_base_members")
    .select(
      "home_base_id, role, can_create_pullsheets, can_delete_pullsheets, can_finalize_pullsheets, home_bases(name, slug), user:profiles(id, full_name, email)"
    )
    .eq("user_id", session.user.id)
    .limit(1)
    .maybeSingle();

  if (membershipResponse.error) {
    redirect("/app");
  }

  const memberships = membershipResponse.data as OwnerMembership | null;

  if (!memberships || memberships.role !== "owner") {
    redirect("/app");
  }

  const homeBaseId = memberships.home_base_id;

  const teamResponse = await supabase
    .from("home_base_members")
    .select(
      "user_id, role, can_create_pullsheets, can_delete_pullsheets, can_finalize_pullsheets, profiles(full_name, email)"
    )
    .eq("home_base_id", homeBaseId);

  const team = (teamResponse.data ?? []) as TeamMember[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Home Base & Team
        </h1>
        <p className="text-sm text-slate-600">
          Manage employees, roles, and permissions for pullsheets & crew planner.
        </p>
      </div>

      <HomeBaseTeam homeBaseId={homeBaseId} team={team ?? []} />
    </div>
  );
}
