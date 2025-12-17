import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { calculateTotalAmortizationForGear } from '@/lib/utils/jobAmortization';

/**
 * POST /api/jobs
 * 
 * Create a new job with equipment amortization tracking
 * 
 * Request body:
 * {
 *   client_name: string
 *   job_date: string (ISO date)
 *   gear: [{ gear_id: string, quantity: number }]
 *   total_price: number
 * }
 * 
 * Response:
 * {
 *   success: true
 *   job: { id, client_name, job_date, total_price, total_amortization }
 *   job_gear: [{ id, job_id, gear_id, quantity, amortization_each, amortization_total }]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { client_name, job_date, gear, total_price, warehouse_location } = body;

    // Validate required fields
    if (!client_name || !job_date || !gear || !total_price) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get warehouse_id from location name if provided
    let warehouse_id = null;
    if (warehouse_location && warehouse_location !== 'All Locations') {
      const { data: warehouseData, error: warehouseError } = await supabase
        .from('warehouses')
        .select('id')
        .eq('name', warehouse_location)
        .single();

      if (warehouseError) {
        console.error('Error fetching warehouse:', warehouseError);
      } else if (warehouseData) {
        warehouse_id = warehouseData.id;
      }
    }

    // If no warehouse specified, try to get user's first accessible warehouse
    if (!warehouse_id) {
      const { data: accessData } = await supabase
        .from('user_warehouse_access')
        .select('warehouse_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (accessData) {
        warehouse_id = accessData.warehouse_id;
      }
    }

    // Fetch gear amortization data from inventory
    const gearIds = gear.map((g: any) => g.gear_id);
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('id, name, amortization_per_job')
      .in('id', gearIds);

    if (inventoryError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch gear data', details: inventoryError },
        { status: 500 }
      );
    }

    // Create lookup map for amortization rates
    const amortizationMap = new Map(
      inventoryItems?.map((item: any) => [item.id, item.amortization_per_job || 0]) || []
    );

    // Calculate total amortization for the job
    let totalAmortization = 0;
    const gearWithAmortization = gear.map((g: any) => {
      const amortizationEach = amortizationMap.get(g.gear_id) || 0;
      const amortizationTotal = calculateTotalAmortizationForGear(
        Number(amortizationEach),
        Number(g.quantity)
      );
      totalAmortization += amortizationTotal;

      return {
        gear_id: g.gear_id,
        quantity: g.quantity,
        amortization_each: amortizationEach,
        amortization_total: amortizationTotal
      };
    });

    // Insert job into jobs table
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .insert({
        title: `Job for ${client_name}`,
        client_name: client_name,
        event_start_date: job_date,
        cost_estimate_amount: total_price,
        total_amortization: totalAmortization,
        created_by: user.id,
        warehouse_id: warehouse_id // Associate job with warehouse
      })
      .select()
      .single();

    if (jobError) {
      return NextResponse.json(
        { success: false, error: 'Failed to create job', details: jobError },
        { status: 500 }
      );
    }

    // Insert job_gear rows
    const jobGearRows = gearWithAmortization.map((g: any) => ({
      job_id: jobData.id,
      gear_id: g.gear_id,
      quantity: g.quantity,
      amortization_each: g.amortization_each,
      amortization_total: g.amortization_total
    }));

    const { data: jobGearData, error: jobGearError } = await supabase
      .from('job_gear')
      .insert(jobGearRows)
      .select();

    if (jobGearError) {
      // Rollback: delete the job if job_gear insert fails
      await supabase.from('jobs').delete().eq('id', jobData.id);
      
      return NextResponse.json(
        { success: false, error: 'Failed to create job gear records', details: jobGearError },
        { status: 500 }
      );
    }

    // Update inventory usage tracking
    for (const g of gearWithAmortization) {
      await supabase.rpc('increment_inventory_usage', {
        item_id: g.gear_id,
        jobs_used: 1,
        amort_amount: g.amortization_total
      });
    }

    return NextResponse.json({
      success: true,
      job: {
        id: jobData.id,
        client_name: jobData.client_name,
        job_date: jobData.event_start_date,
        total_price: jobData.cost_estimate_amount,
        total_amortization: jobData.total_amortization
      },
      job_gear: jobGearData
    });

  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs
 * 
 * Fetch all jobs with amortization data
 */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        client_name,
        event_start_date,
        cost_estimate_amount,
        total_amortization,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch jobs', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, jobs });

  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
