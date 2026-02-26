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
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('id')
      .eq('organization_id', org.id)
      .single();

    if (!license) {
      // Create license if it doesn't exist
      const { error: createError } = await supabase
        .from('licenses')
        .insert({
          organization_id: org.id,
          stripe_customer_id: `temp_${org.id}`,
          plan: plan,
          status: 'active'
        });

      if (createError) {
        return NextResponse.json(
          { error: 'Failed to create license: ' + createError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `License created with plan: ${plan}`
      });
    }

    // Update existing license
    const { error: updateError } = await supabase
      .from('licenses')
      .update({ plan: plan })
      .eq('organization_id', org.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update license: ' + updateError.message },
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
