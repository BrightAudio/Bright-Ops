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
 * GET /api/v1/pullsheets/[id]/items
 * Get items for a specific pull sheet
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const pullsheetId = params.id;

    // Get pull sheet items with inventory details
    const { data, error } = await supabase
      .from('pull_sheet_items')
      .select(`
        id,
        item_name,
        qty_requested,
        qty_pulled,
        qty_fulfilled,
        category,
        prep_status,
        notes,
        inventory_item_id,
        inventory_items(id, name, barcode, location)
      `)
      .eq('pull_sheet_id', pullsheetId)
      .order('sort_index', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Pull sheet items API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/pullsheets/[id]/items
 * Update item quantities (for scanning workflow)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await validateToken(request);
  
  if (!auth.valid || !auth.user) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401 }
    );
  }

  try {
    const { item_id, qty_pulled, prep_status } = await request.json();

    if (!item_id) {
      return NextResponse.json(
        { error: 'item_id required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const updates: any = {};
    if (qty_pulled !== undefined) updates.qty_pulled = qty_pulled;
    if (prep_status) updates.prep_status = prep_status;

    const { data, error } = await supabase
      .from('pull_sheet_items')
      .update(updates)
      .eq('id', item_id)
      .eq('pull_sheet_id', params.id)
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
    console.error('Update item error:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}
