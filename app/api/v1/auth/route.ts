import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/v1/auth
 * Mobile authentication endpoint - validates Supabase token and returns user info
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user profile and organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, organization_id, organizations(name)')
      .eq('id', user.id)
      .single();

    // Get user's warehouse access
    const { data: warehouses } = await supabase
      .from('user_warehouse_access')
      .select('warehouse_id, warehouses(id, name, address)')
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        profile: profile,
        warehouses: warehouses?.map(w => (w as any).warehouses) || []
      }
    });

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/auth/refresh
 * Refresh access token
 */
export async function GET(request: NextRequest) {
  try {
    const refreshToken = request.headers.get('x-refresh-token');
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error || !data.session) {
      return NextResponse.json(
        { error: 'Token refresh failed' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at
    });

  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}
