import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || '',
          },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all warehouses the user has access to
    const { data: warehouses, error } = await supabase
      .from('user_warehouse_access')
      .select(`
        warehouse_id,
        warehouses (
          id,
          name,
          address
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching warehouses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch warehouses' },
        { status: 500 }
      );
    }

    // Extract warehouse data
    const warehouseList = warehouses?.map((w: any) => w.warehouses).filter(Boolean) || [];

    return NextResponse.json({ warehouses: warehouseList });
  } catch (error) {
    console.error('Warehouses API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
