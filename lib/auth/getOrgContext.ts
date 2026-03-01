// lib/auth/getOrgContext.ts
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import type { NextRequest } from 'next/server';

/**
 * Extract userId + organizationId from Supabase SSR cookies
 * Used by API routes to authorize based on authenticated session
 * 
 * Pattern: Route Handler cookies → auth session → user_profiles → org lookup
 */
export async function getOrgContext(_req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  // 1. Get authenticated user from session cookies
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('UNAUTHENTICATED');
  }

  // 2. Lookup organization_id from user_profiles
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.organization_id) {
    throw new Error('NO_ORGANIZATION');
  }

  return {
    userId: user.id,
    organizationId: profile.organization_id
  };
}
