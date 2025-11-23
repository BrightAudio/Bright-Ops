import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Simple API key authentication
function validateApiKey(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  const validApiKey = process.env.MOBILE_API_KEY;
  
  if (!validApiKey) {
    return { valid: false, error: 'API key not configured' };
  }
  
  if (!apiKey || apiKey !== validApiKey) {
    return { valid: false, error: 'Invalid API key' };
  }
  
  return { valid: true };
}

// GET /api/mobile/applications
// Get all financing applications or filter by client
export async function GET(request: NextRequest) {
  // Validate API key
  const auth = validateApiKey(request);
  if (!auth.valid) {
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
    const clientId = searchParams.get('client_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('financing_applications')
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone
        ),
        equipment_items (
          id,
          name,
          purchase_cost,
          status
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      applications: data,
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Applications API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

// POST /api/mobile/applications
// Create a new financing application
export async function POST(request: NextRequest) {
  // Validate API key
  const auth = validateApiKey(request);
  if (!auth.valid) {
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

    const body = await request.json();
    const {
      client_id,
      equipment_cost,
      sales_tax_rate,
      term_months,
      residual_percentage,
      monthly_payment,
      equipment_items,
      notes
    } = body;

    // Validate required fields
    if (!client_id || !equipment_cost || !term_months) {
      return NextResponse.json(
        { error: 'client_id, equipment_cost, and term_months are required' },
        { status: 400 }
      );
    }

    // Create the application
    const { data: application, error: appError } = await supabase
      .from('financing_applications')
      .insert({
        client_id,
        equipment_cost: parseFloat(equipment_cost),
        sales_tax_rate: parseFloat(sales_tax_rate || '0'),
        term_months: parseInt(term_months),
        residual_percentage: parseFloat(residual_percentage || '10'),
        monthly_payment: parseFloat(monthly_payment),
        status: 'pending',
        notes: notes || ''
      })
      .select()
      .single();

    if (appError) {
      console.error('Supabase error:', appError);
      return NextResponse.json(
        { error: 'Failed to create application' },
        { status: 500 }
      );
    }

    // If equipment items provided, create them
    if (equipment_items && Array.isArray(equipment_items) && equipment_items.length > 0) {
      const equipmentData = equipment_items.map((item: any) => ({
        financing_application_id: application.id,
        name: item.name,
        purchase_cost: parseFloat(item.purchase_cost || '0'),
        status: 'active'
      }));

      const { error: equipError } = await supabase
        .from('equipment_items')
        .insert(equipmentData);

      if (equipError) {
        console.error('Equipment creation error:', equipError);
        // Application created but equipment failed - still return success
      }
    }

    return NextResponse.json({
      success: true,
      application: application,
      message: 'Application created successfully'
    });

  } catch (error) {
    console.error('Applications POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    );
  }
}
