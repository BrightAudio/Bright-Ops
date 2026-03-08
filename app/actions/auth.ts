"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAction } from "@/lib/supabaseAction";
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// User seat limits per plan type
const PLAN_USER_LIMITS = {
  starter: 2,
  pro: 5,
  enterprise: Infinity, // Unlimited
};

async function checkUserLicenseAndSeats(userId: string) {
  try {
    // Get user profile to find organization
    const { data: userProfile, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (profileErr || !userProfile?.organization_id) {
      console.error('[checkUserLicense] No organization found:', profileErr);
      return { hasLicense: false, licenseStatus: 'unknown', seatsAvailable: false };
    }

    // Get license for organization
    const { data: license, error: licenseErr } = await supabaseAdmin
      .from('licenses')
      .select('status, delinquent_since, plan')
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (licenseErr || !license) {
      console.error('[checkUserLicense] No license found:', licenseErr);
      return { hasLicense: false, licenseStatus: 'unknown', seatsAvailable: false };
    }

    // Check if license is active (not restricted)
    const isActive = license.status === 'active' || license.status === 'warning';
    console.log('[checkUserLicense] License status:', license.status, 'isActive:', isActive);

    // If license not active, fail early
    if (!isActive) {
      return { hasLicense: false, licenseStatus: license.status, seatsAvailable: false };
    }

    // Check user seat limits
    const planType = (license.plan || 'starter').toLowerCase() as keyof typeof PLAN_USER_LIMITS;
    const userLimit = PLAN_USER_LIMITS[planType] || 2;

    // Count active users (users with most recent login in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activeUsers, error: activeUsersErr } = await supabaseAdmin
      .from('user_profiles')
      .select('id', { count: 'exact' })
      .eq('organization_id', userProfile.organization_id)
      .gte('last_login_at', thirtyDaysAgo);

    if (activeUsersErr) {
      console.warn('[checkUserLicense] Error counting active users:', activeUsersErr);
      // Allow login anyway if we can't count - fail open for user experience
      return { hasLicense: true, licenseStatus: license.status, seatsAvailable: true };
    }

    const activeUserCount = activeUsers?.length || 0;
    const seatsAvailable = activeUserCount < userLimit;

    console.log(`[checkUserLicense] Plan: ${planType}, Limit: ${userLimit}, Active users: ${activeUserCount}, Seats available: ${seatsAvailable}`);

    return { 
      hasLicense: isActive, 
      licenseStatus: license.status, 
      seatsAvailable,
      plan: planType,
      activeUserCount,
      userLimit
    };
  } catch (error) {
    console.error('[checkUserLicense] Error:', error);
    return { hasLicense: false, licenseStatus: 'error', seatsAvailable: false };
  }
}

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
  
  // Check user's license status and seat availability
  const licenseCheck = await checkUserLicenseAndSeats(data.user?.id || '');
  
  if (!licenseCheck.hasLicense) {
    console.log('[loginAction] No active license, redirecting to subscribe');
    revalidatePath("/", "layout");
    redirect("/auth/no-license");
  }

  if (!licenseCheck.seatsAvailable) {
    console.log('[loginAction] License seat limit exceeded, redirecting to upgrade');
    revalidatePath("/", "layout");
    redirect(`/auth/seats-exceeded?plan=${licenseCheck.plan}&limit=${licenseCheck.userLimit}&current=${licenseCheck.activeUserCount}`);
  }

  // Update last_login_at for this user
  await supabaseAdmin
    .from('user_profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.user?.id);

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

  // Check if email confirmation is required
  if (data.user && !data.session) {
    // Email confirmation required - user created but not logged in
    return { 
      success: true, 
      message: "Account created! Check your email for a verification link. Once verified, you can log in.",
      requiresVerification: true 
    };
  }

  if (data.session) {
    // Auto-login enabled (email confirmation disabled in Supabase)
    // Still allow this flow for development/testing
    revalidatePath("/", "layout");
    redirect("/onboarding");
  }

  // Fallback message
  return { success: true, message: "Account created! Please check your email to verify your account." };
}

export async function logoutAction() {
  const supabase = await supabaseAction();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}
