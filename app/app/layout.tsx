import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth/login");
  }

  // DashboardLayout component now handles the sidebar and topbar
  return <>{children}</>;
}
