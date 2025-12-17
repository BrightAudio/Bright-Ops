import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Validate Supabase JWT token
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
 * GET /api/v1/inventory
 * Get inventory items for mobile app
 * Query params: warehouse_id, category, search, limit, offset
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
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Verify user has access to warehouse
    if (warehouseId) {
      const { data: access } = await supabase
        .from('user_warehouse_access')
        .select('warehouse_id')
        .eq('user_id', auth.user.id)
        .eq('warehouse_id', warehouseId)
        .single();

      if (!access) {
        return NextResponse.json(
          { error: 'No access to this warehouse' },
          { status: 403 }
        );
      }
    }

    let query = supabase
      .from('inventory_items')
      .select('id, name, barcode, category, subcategory, quantity_on_hand, unit_value, location, maintenance_status')
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    // Note: inventory_items table doesn't have warehouse_id column
    // Warehouse filtering would need to be done via location field or a join table

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%`);
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
    console.error('Inventory API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/inventory/scan
 * Scan barcode and get item info
 * Body: { barcode: string, warehouse_id?: string }
 */
export async function POST(request: NextRequest) {
  const auth = await validateToken(request);
  
  if (!auth.valid || !auth.user) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401 }
    );
  }

  try {
    const { barcode, warehouse_id } = await request.json();

    if (!barcode) {
      return NextResponse.json(
        { error: 'Barcode required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from('inventory_items')
      .select('id, name, barcode, category, subcategory, quantity_on_hand, unit_value, location, maintenance_status, warehouse_id')
      .eq('barcode', barcode);

    if (warehouse_id) {
      query = query.eq('warehouse_id', warehouse_id);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        found: false,
        message: 'Item not found'
      });
    }

    return NextResponse.json({
      success: true,
      found: true,
      data: data
    });

  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: 'Scan failed' },
      { status: 500 }
    );
  }
}
