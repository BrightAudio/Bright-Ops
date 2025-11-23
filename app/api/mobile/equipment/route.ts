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

// GET /api/mobile/equipment
// Get equipment items, optionally filtered
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
    const applicationId = searchParams.get('application_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = supabase
      .from('equipment_items')
      .select(`
        *,
        financing_applications (
          id,
          status,
          term_months,
          monthly_payment,
          clients (
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (applicationId) {
      query = query.eq('financing_application_id', applicationId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch equipment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      equipment: data,
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Equipment API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}
