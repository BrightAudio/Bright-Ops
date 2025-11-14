import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leads } = body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads provided. Expected array of lead objects.' },
        { status: 400 }
      );
    }

    // Validate and sanitize leads
    const validatedLeads = leads.map((lead: any) => {
      if (!lead.name || !lead.email) {
        throw new Error('Each lead must have at least name and email');
      }

      return {
        name: String(lead.name).trim(),
        email: String(lead.email).trim().toLowerCase(),
        org: lead.org || lead.organization || lead.company || null,
        title: lead.title || lead.position || lead.job_title || null,
        snippet: lead.snippet || lead.notes || lead.description || null,
        status: lead.status || 'uncontacted',
        source: lead.source || 'csv_import',
      };
    });

    // Insert leads into database
    const { data: insertedLeads, error: insertError } = await supabase
      .from('leads')
      .insert(validatedLeads as any)
      .select();

    if (insertError) {
      // Handle duplicate emails gracefully
      if (insertError.code === '23505') { // Unique violation
        return NextResponse.json(
          { 
            error: 'Some leads already exist (duplicate emails)',
            details: insertError.message,
          },
          { status: 409 }
        );
      }
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      count: insertedLeads?.length || 0,
      leads: insertedLeads,
      message: `Successfully imported ${insertedLeads?.length || 0} leads`,
    });

  } catch (error: any) {
    console.error('CSV Import Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to import leads',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
