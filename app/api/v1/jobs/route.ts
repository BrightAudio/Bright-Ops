import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function validateToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing authorization header', user: null };
  }

  const token = authHeader.substring(7);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { valid: false, error: 'Invalid token', user: null };
    }

    return { valid: true, user, error: null };
  } catch (error) {
    return { valid: false, error: 'Token validation failed', user: null };
  }
}

export async function GET(request: NextRequest) {
  const auth = await validateToken(request);
  
  if (!auth.valid || !auth.user) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401 }
    );
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouse_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('jobs')
      .select(`
        id,
        code,
        title,
        status,
        start_at,
        end_at,
        warehouse_id,
        client_id,
        clients(name)
      `)
      .order('start_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('Jobs API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
