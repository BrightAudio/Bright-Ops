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

    const { leadId } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
    }

    // Call the scoring function
    const { data, error } = await supabase.rpc('calculate_lead_score', {
      lead_id_param: leadId
    });

    if (error) throw error;

    // Log activity
    await supabase.from('lead_activities').insert({
      lead_id: leadId,
      activity_type: 'score_changed',
      title: 'Score Updated',
      description: `Lead score recalculated to ${data}`,
      metadata: { new_score: data },
      created_by: user.id,
    } as any);

    return NextResponse.json({ score: data });
  } catch (error: any) {
    console.error('Error calculating score:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate score' },
      { status: 500 }
    );
  }
}

// Batch recalculate scores for all leads
export async function PUT(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all lead IDs
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id');

    if (leadsError) throw leadsError;

    let updated = 0;
    for (const lead of (leads as any) || []) {
      try {
        await supabase.rpc('calculate_lead_score', {
          lead_id_param: lead.id
        });
        updated++;
      } catch (err) {
        console.error(`Error updating score for lead ${lead.id}:`, err);
      }
    }

    return NextResponse.json({ message: `Updated scores for ${updated} leads` });
  } catch (error: any) {
    console.error('Error batch updating scores:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update scores' },
      { status: 500 }
    );
  }
}
