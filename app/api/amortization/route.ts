import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { calculateTotalAmortizationForGear } from '@/lib/utils/amortization';

type GearSelection = { 
  inventory_item_id: string; 
  quantity?: number; 
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      job_id, 
      gear = [] 
    }: { 
      job_id: string;
      gear: GearSelection[];
    } = body;

    if (!job_id) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 });
    }

    // 1) Fetch gear amortization snapshot from inventory
    const gearIds = gear.map(g => g.inventory_item_id);
    const { data: gearRows, error } = await supabase
      .from('inventory_items')
      .select('id, name, amortization_per_job')
      .in('id', gearIds);

    if (error) throw error;

    // Map amortization by id
    const amortMap: Record<string, { name: string; amort: number }> = {};
    for (const r of gearRows || []) {
      amortMap[r.id] = {
        name: r.name || 'Unknown Item',
        amort: Number(r.amortization_per_job || 0)
      };
    }

    // 2) Compute line items with amortization snapshot
    let totalAmortization = 0;
    const lineItems = gear.map((g, idx) => {
      const itemData = amortMap[g.inventory_item_id];
      const amortEach = itemData?.amort ?? 0;
      const qty = g.quantity ?? 1;
      const amortTotal = calculateTotalAmortizationForGear(amortEach, qty);
      totalAmortization += amortTotal;

      return {
        job_id,
        item_type: 'equipment',
        item_name: itemData?.name || 'Unknown',
        description: `Amortization: $${amortEach.toFixed(4)}/job × ${qty} units = $${amortTotal.toFixed(2)}`,
        quantity: qty,
        unit_cost: 0, // Rental cost separate from amortization
        // Store amortization in description or custom field
        sort_order: idx,
        is_editable: false
      };
    });

    // 3) Insert line items into cost_estimate_line_items
    const { data: insertedItems, error: insertErr } = await supabase
      .from('cost_estimate_line_items')
      .insert(lineItems)
      .select();

    if (insertErr) throw insertErr;

    // 4) Update accumulated amortization on inventory items
    for (const g of gear) {
      const itemData = amortMap[g.inventory_item_id];
      if (!itemData) continue;

      const qty = g.quantity ?? 1;
      const amortTotal = calculateTotalAmortizationForGear(itemData.amort, qty);

      // Increment total_jobs_used and accumulated_amortization
      await supabase.rpc('increment_inventory_usage', {
        item_id: g.inventory_item_id,
        jobs_used: 1,
        amort_amount: amortTotal
      });
    }

    return NextResponse.json({
      success: true,
      total_amortization: totalAmortization,
      line_items: insertedItems
    });

  } catch (e) {
    console.error('Amortization calculation error:', e);
    return NextResponse.json(
      { error: 'Server error', details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
