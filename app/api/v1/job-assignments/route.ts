import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch user's job assignments
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

    // Get employee record
    const { data: employee } = await supabase
      .from('employees')
      .select('id, warehouse_id')
      .eq('user_id', user.id)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Get job assignments with job details
    const { data: assignments, error } = await supabase
      .from('job_assignments')
      .select(`
        id,
        job_id,
        role,
        status,
        jobs (
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
        )
      `)
      .eq('employee_id', employee.id)
      .order('jobs(start_at)', { ascending: true });

    if (error) {
      console.error('Error fetching assignments:', error);
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }

    return NextResponse.json({ assignments: assignments || [] });
  } catch (error) {
    console.error('Job assignments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Volunteer for a job
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
    const { job_id, role } = body;

    if (!job_id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Get employee record
    const { data: employee } = await supabase
      .from('employees')
      .select('id, warehouse_id')
      .eq('user_id', user.id)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Verify job exists and is in same warehouse
    const { data: job } = await supabase
      .from('jobs')
      .select('id, warehouse_id')
      .eq('id', job_id)
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.warehouse_id !== employee.warehouse_id) {
      return NextResponse.json({ error: 'Job is not in your warehouse' }, { status: 403 });
    }

    // Create job assignment
    const { data, error } = await supabase
      .from('job_assignments')
      .insert({
        job_id,
        employee_id: employee.id,
        role: role || 'Crew',
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating assignment:', error);
      return NextResponse.json({ error: 'Failed to volunteer for job' }, { status: 500 });
    }

    return NextResponse.json({ assignment: data });
  } catch (error) {
    console.error('Job assignment POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove volunteer assignment
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('id');

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
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

    // Delete assignment (only if it belongs to this employee)
    const { error } = await supabase
      .from('job_assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('employee_id', employee.id);

    if (error) {
      console.error('Error deleting assignment:', error);
      return NextResponse.json({ error: 'Failed to remove assignment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Job assignment DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
