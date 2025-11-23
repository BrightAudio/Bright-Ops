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

// GET /api/mobile/payments
// Get payment history and schedules
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
    const clientId = searchParams.get('client_id');
    const status = searchParams.get('status'); // paid, pending, overdue
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = supabase
      .from('financing_payments')
      .select(`
        *,
        financing_applications (
          id,
          status,
          term_months,
          monthly_payment,
          clients (
            id,
            name,
            email
          )
        )
      `)
      .order('due_date', { ascending: false })
      .limit(limit);

    if (applicationId) {
      query = query.eq('financing_application_id', applicationId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // If filtering by client, need to join through applications
    let data, error;
    if (clientId) {
      const { data: payments, error: paymentsError } = await query;
      
      if (paymentsError) {
        error = paymentsError;
      } else {
        // Filter by client_id
        data = payments?.filter(p => 
          p.financing_applications?.clients?.id === clientId
        );
      }
    } else {
      const result = await query;
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const totalPaid = data?.filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
    
    const totalPending = data?.filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    const overdueCount = data?.filter(p => {
      if (p.status !== 'pending') return false;
      const dueDate = new Date(p.due_date);
      return dueDate < new Date();
    }).length || 0;

    return NextResponse.json({
      success: true,
      payments: data,
      summary: {
        totalPaid,
        totalPending,
        overdueCount,
        count: data?.length || 0
      }
    });

  } catch (error) {
    console.error('Payments API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
