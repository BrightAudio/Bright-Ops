import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * GET /api/inventory/[id]
 * 
 * Debug endpoint to test server-side fetch of inventory item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('[DEBUG API] Fetching inventory item with id:', id);
    
    const supabase = await supabaseServer();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[DEBUG API] Auth user:', user?.id);
    console.log('[DEBUG API] Auth error:', authError);
    
    // Fetch the inventory item
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .single();
    
    console.log('[DEBUG API] Query result data:', data);
    console.log('[DEBUG API] Query result error:', error);
    
    if (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          details: error,
          id: id,
          authenticated: !!user
        },
        { status: error.code === 'PGRST116' ? 404 : 500 }
      );
    }
    
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Item not found', id: id },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      item: data,
      id: id,
      authenticated: !!user
    });
    
  } catch (error) {
    console.error('[DEBUG API] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
