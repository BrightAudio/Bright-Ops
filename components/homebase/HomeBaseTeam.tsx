'use client';

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import type { TablesUpdate } from "@/lib/supabaseClient";

type PermissionField =
  | "can_create_pullsheets"
  | "can_delete_pullsheets"
  | "can_finalize_pullsheets";

type Member = {
  user_id: string;
  role: "owner" | "admin" | "crew";
  can_create_pullsheets: boolean;
  can_delete_pullsheets: boolean;
  can_finalize_pullsheets: boolean;
  profiles: { full_name: string | null; email: string | null } | null;
};

export default function HomeBaseTeam({
  homeBaseId,
  team,
}: {
  homeBaseId: string;
  team: Member[];
}) {
  const supabase = supabaseBrowser();
  const [members, setMembers] = useState(team);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (idx: number, field: PermissionField) => {
    const current = members[idx];
    const nextValue = !current[field];

    setMembers((prev) =>
      prev.map((member, memberIdx) =>
        memberIdx === idx ? { ...member, [field]: nextValue } : member
      )
    );
    setSaving(true);
    setError(null);

    const updates: TablesUpdate<"home_base_members"> = { [field]: nextValue };
    const { error: updateError } = await supabase
      .from("home_base_members")
      .update<TablesUpdate<"home_base_members">>(updates)
      .eq("home_base_id", homeBaseId)
      .eq("user_id", current.user_id);

    if (updateError) {
      setMembers((prev) =>
        prev.map((member, memberIdx) =>
          memberIdx === idx ? { ...member, [field]: current[field] } : member
        )
      );
      setError("Unable to update permissions. Please try again.");
    }

    setSaving(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-semibold text-slate-800">Team Members</h2>
        <span className="text-[10px] text-slate-500">
          {saving ? "Saving..." : "\u00a0"}
        </span>
      </div>
      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500">
              <th className="text-left py-2">Name</th>
              <th className="text-left">Email</th>
              <th className="text-left">Role</th>
              <th>Create Pullsheets</th>
              <th>Delete Pullsheets</th>
              <th>Finalize Pullsheets</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, idx) => (
              <tr key={member.user_id} className="border-t border-slate-100">
                <td className="py-2">{member.profiles?.full_name || "\u2014"}</td>
                <td>{member.profiles?.email || "\u2014"}</td>
                <td className="capitalize text-slate-700">{member.role}</td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    checked={member.can_create_pullsheets}
                    onChange={() => toggle(idx, "can_create_pullsheets")}
                    disabled={member.role === "owner"}
                  />
                </td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    checked={member.can_delete_pullsheets}
                    onChange={() => toggle(idx, "can_delete_pullsheets")}
                    disabled={member.role === "owner"}
                  />
                </td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    checked={member.can_finalize_pullsheets}
                    onChange={() => toggle(idx, "can_finalize_pullsheets")}
                    disabled={member.role === "owner"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Copilot: add "Invite employee" flow (email -> create auth user / send invite) */}
    </div>
  );
}
