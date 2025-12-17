import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch user's availability
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get employee record for this user
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Get availability records
    const { data: availability, error } = await supabase
      .from('employee_availability')
      .select('*')
      .eq('employee_id', employee.id)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching availability:', error);
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }

    return NextResponse.json({ availability: availability || [] });
  } catch (error) {
    console.error('Availability API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Set availability
export async function POST(request: NextRequest) {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, status } = body;

    if (!date || !status) {
      return NextResponse.json({ error: 'Date and status are required' }, { status: 400 });
    }

    // Get employee record
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Upsert availability
    const { data, error } = await supabase
      .from('employee_availability')
      .upsert({
        employee_id: employee.id,
        date,
        status
      }, {
        onConflict: 'employee_id,date'
      })
      .select()
      .single();

    if (error) {
      console.error('Error setting availability:', error);
      return NextResponse.json({ error: 'Failed to set availability' }, { status: 500 });
    }

    return NextResponse.json({ availability: data });
  } catch (error) {
    console.error('Availability POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
