import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch available jobs that need crew
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

    // Get employee's warehouse
    const { data: employee } = await supabase
      .from('employees')
      .select('warehouse_id')
      .eq('user_id', user.id)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Get jobs that need crew in the same warehouse
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select(`
        id,
        code,
        title,
        start_at,
        end_at,
        status,
        warehouse_id,
        clients (
          name
        )
      `)
      .eq('warehouse_id', employee.warehouse_id)
      .in('status', ['Scheduled', 'Confirmed'])
      .gte('end_at', new Date().toISOString())
      .order('start_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error fetching available jobs:', error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    return NextResponse.json({ jobs: jobs || [] });
  } catch (error) {
    console.error('Available jobs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
