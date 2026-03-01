/**
 * Get token statistics for organization
 * GET /api/v1/tokens/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTokenStats } from '@/lib/utils/aiTokens';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing organizationId query parameter' },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (orgError || userOrg?.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'Forbidden - no access to this organization' },
        { status: 403 }
      );
    }

    const stats = await getTokenStats(organizationId);

    if (!stats) {
      return NextResponse.json(
        { error: 'Failed to fetch token stats' },
        { status: 500 }
      );
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Token stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
