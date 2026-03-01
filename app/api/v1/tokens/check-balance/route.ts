/**
 * Token validation middleware API route
 * POST /api/v1/tokens/check-balance
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasEnoughTokens, deductTokens } from '@/lib/utils/aiTokens';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const { organizationId, featureUsed, action = 'check' } = await request.json();

    if (!organizationId || !featureUsed) {
      return NextResponse.json(
        { error: 'Missing organizationId or featureUsed' },
        { status: 400 }
      );
    }

    if (action === 'check') {
      // Just check balance
      const hasTokens = await hasEnoughTokens(organizationId, featureUsed);
      return NextResponse.json({ hasTokens });
    }

    if (action === 'deduct') {
      // Get user from session
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized - no user session' },
          { status: 401 }
        );
      }

      const result = await deductTokens(organizationId, user.id, featureUsed, {
        requestedAt: new Date().toISOString(),
      });

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "check" or "deduct"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
