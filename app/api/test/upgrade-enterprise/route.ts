import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/test/upgrade-enterprise
 * 
 * Test endpoint to upgrade the first organization to enterprise tier
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Upgrade-enterprise endpoint called');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRole) {
      console.error('❌ Missing Supabase env vars');
      return NextResponse.json(
        { success: false, message: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole, {
      auth: { persistSession: false },
    });

    console.log('🔐 Supabase client created');

    // Get first organization
    const { data: orgs, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, plan')
      .limit(1);

    console.log('📊 Organizations fetch result:', { orgs, error: fetchError });

    if (fetchError || !orgs || orgs.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No organizations found' },
        { status: 404 }
      );
    }

    const org = orgs[0];
    console.log('🎯 Found org:', org);

    // Update to enterprise
    const { data, error } = await supabase
      .from('organizations')
      .update({ plan: 'enterprise' })
      .eq('id', org.id)
      .select();

    console.log('✏️ Update result:', { data, error });

    if (error) {
      return NextResponse.json(
        { success: false, message: `Update failed: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Successfully upgraded to enterprise');

    return NextResponse.json({
      success: true,
      message: `Organization upgraded to enterprise!`,
      organization: data?.[0] || org,
    });
  } catch (error) {
    console.error('❌ Error in upgrade-enterprise:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'Upgrade to Enterprise',
    description: 'POST to upgrade first org to enterprise',
  });
}
