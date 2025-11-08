"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAction } from "@/lib/supabaseAction";

export async function loginAction(email: string, password: string) {
  const supabase = await supabaseAction();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('[loginAction] Auth error:', error);
    return { error: error.message, success: false };
  }

  if (!data.session) {
    console.error('[loginAction] No session created');
    return { error: "No session created", success: false };
  }

  console.log('[loginAction] Session created, user:', data.user?.email);
  revalidatePath("/", "layout");
  redirect("/app/warehouse");
}

export async function signupAction(email: string, password: string, fullName: string, industry: string) {
  const supabase = await supabaseAction();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      data: {
        full_name: fullName,
        industry: industry || null,
      },
    },
  });

  if (error) {
    return { error: error.message, success: false };
  }

  if (data.session) {
    // Auto-login enabled (email confirmation disabled)
    revalidatePath("/", "layout");
    redirect("/app/warehouse");
  }

  // Email confirmation required
  return { success: true, message: "Check your email to confirm your account. Once confirmed, you can log in!" };
}

export async function logoutAction() {
  const supabase = await supabaseAction();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
