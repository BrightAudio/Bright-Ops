import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { secretId, plan } = await req.json();

    if (!secretId || !plan) {
      return NextResponse.json(
        { error: 'Missing secretId or plan' },
        { status: 400 }
      );
    }

    if (!['starter', 'pro', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    // Find organization by secret_id
    const supabase = await supabaseServer();
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('secret_id', secretId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if license exists
    const { data: existingOrg, error: checkError } = await supabase
      .from('organizations')
      .select('id, plan')
      .eq('id', org.id)
      .single();

    if (checkError) {
      return NextResponse.json(
        { error: 'Failed to fetch organization: ' + checkError.message },
        { status: 500 }
      );
    }

    // Update organization plan
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ plan })
      .eq('id', org.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update plan: ' + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `License upgraded to: ${plan}`
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
