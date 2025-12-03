import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/inventory/rig-scan
 * 
 * Scan a rig barcode to update location/status of all items in the rig
 * When a rig is scanned in/out, all items move together as one unit
 * 
 * Body:
 * {
 *   barcode: string (RIG-XXX format),
 *   location: string (where the rig is now),
 *   status: string (available, checked_out, in_transit, etc),
 *   job_id?: string (optional - if scanning for a job)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { barcode, location, status, job_id } = body;

    if (!barcode || !location || !status) {
      return NextResponse.json(
        { error: 'barcode, location, and status are required' },
        { status: 400 }
      );
    }

    // Verify it's a rig barcode
    if (!barcode.startsWith('RIG-')) {
      return NextResponse.json(
        { error: 'Invalid rig barcode format. Must start with RIG-' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get the rig container
    const { data: rig, error: rigError } = await supabase
      .from('rig_containers')
      .select('id, name, barcode')
      .eq('barcode', barcode)
      .single();

    if (rigError || !rig) {
      return NextResponse.json(
        { error: 'Rig not found with barcode: ' + barcode },
        { status: 404 }
      );
    }

    // Get all items in this rig
    const { data: rigItems, error: itemsError } = await supabase
      .from('rig_container_items')
      .select(`
        id,
        inventory_item_id,
        quantity,
        inventory_items:inventory_item_id (
          id,
          name,
          barcode
        )
      `)
      .eq('rig_container_id', rig.id);

    if (itemsError) {
      return NextResponse.json(
        { error: 'Failed to fetch rig items: ' + itemsError.message },
        { status: 500 }
      );
    }

    if (!rigItems || rigItems.length === 0) {
      return NextResponse.json(
        { 
          success: true, 
          message: `Rig "${rig.name}" has no items to update`,
          rig_id: rig.id,
          items_updated: 0
        },
        { status: 200 }
      );
    }

    // Update all items in the rig
    const itemIds = rigItems.map((item: any) => item.inventory_item_id);
    const { error: updateError } = await supabase
      .from('inventory_items')
      .update({
        location,
        status,
        updated_at: new Date().toISOString()
      })
      .in('id', itemIds);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update items: ' + updateError.message },
        { status: 500 }
      );
    }

    // Create scan event records for each item
    const scanEvents = rigItems.map((item: any) => ({
      barcode: item.inventory_items?.barcode,
      inventory_item_id: item.inventory_item_id,
      location,
      status,
      job_id: job_id || null,
      scanned_at: new Date().toISOString(),
      notes: `Scanned as part of rig: ${rig.name} (${rig.barcode})`
    }));

    const { error: scanError } = await supabase
      .from('scan_events')
      .insert(scanEvents);

    if (scanError) {
      console.error('Failed to create scan events:', scanError);
      // Don't fail the request - scan events are audit trail, not critical
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${rigItems.length} items in rig "${rig.name}"`,
      rig_id: rig.id,
      rig_name: rig.name,
      rig_barcode: rig.barcode,
      items_updated: rigItems.length,
      new_location: location,
      new_status: status,
      items: rigItems.map((item: any) => ({
        id: item.inventory_item_id,
        name: item.inventory_items?.name,
        barcode: item.inventory_items?.barcode,
        quantity: item.quantity
      }))
    });

  } catch (error: any) {
    console.error('Rig scan error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
