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

/**
 * GET /api/v1/pullsheets
 * Get pull sheets for mobile app
 * Query params: warehouse_id, status, limit, offset
 */
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
      .from('pull_sheets')
      .select(`
        id,
        name,
        code,
        status,
        scheduled_out_at,
        expected_return_at,
        warehouse_id,
        job_id,
        jobs(id, code, title, client_id, clients(name))
      `)
      .order('created_at', { ascending: false })
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
    console.error('Pull sheets API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pull sheets' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/pullsheets/:id/items
 * Get items for a specific pull sheet
 */
export async function PUT(request: NextRequest) {
  const auth = await validateToken(request);
  
  if (!auth.valid || !auth.user) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401 }
    );
  }

  try {
    const { pullsheet_id, item_id, qty_pulled } = await request.json();

    if (!pullsheet_id || !item_id || qty_pulled === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: pullsheet_id, item_id, qty_pulled' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update pull sheet item
    const { data, error } = await supabase
      .from('pull_sheet_items')
      .update({ qty_pulled: qty_pulled })
      .eq('id', item_id)
      .eq('pull_sheet_id', pullsheet_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Update pull sheet item error:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}
