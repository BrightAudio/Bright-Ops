import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * TEST ENDPOINT - Check if job titles table is populated
 * This helps debug the auto-search without needing Google API
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 TEST ENDPOINT: Checking database setup...');

    // Use service role key (admin) to bypass RLS policies
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('✅ Supabase admin client initialized');

    // Check job titles table
    const { data: jobTitles, error: jobError } = await supabase
      .from('lead_job_titles')
      .select('*')
      .eq('is_active', true)
      .limit(5);

    console.log('📋 Job titles check:');
    console.log('   Error:', jobError);
    console.log('   Count:', jobTitles?.length || 0);
    if (jobTitles && jobTitles.length > 0) {
      console.log('   Sample:', jobTitles[0]);
    }

    // Check search keywords table
    const { data: keywords, error: keywordError } = await supabase
      .from('lead_search_keywords')
      .select('*')
      .eq('is_active', true);

    console.log('🔑 Keywords check:');
    console.log('   Error:', keywordError);
    console.log('   Count:', keywords?.length || 0);

    // Check leads settings (Google API)
    const { data: settings, error: settingsError } = await supabase
      .from('leads_settings')
      .select('google_api_key, google_search_engine_id, created_at')
      .single();

    console.log('⚙️ Settings check:');
    console.log('   Error:', settingsError);
    console.log('   Has API key:', !!settings?.google_api_key);
    console.log('   Has Search Engine ID:', !!settings?.google_search_engine_id);
    console.log('   Created at:', settings?.created_at);

    // Check if we can query the leads table
    const { data: existingLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, email')
      .limit(3);

    console.log('📌 Leads table check:');
    console.log('   Error:', leadsError);
    console.log('   Count:', existingLeads?.length || 0);

    return NextResponse.json({
      status: 'Database check complete',
      checks: {
        jobTitles: {
          count: jobTitles?.length || 0,
          error: jobError?.message || null,
          hasData: (jobTitles?.length || 0) > 0,
        },
        keywords: {
          count: keywords?.length || 0,
          error: keywordError?.message || null,
          hasData: (keywords?.length || 0) > 0,
        },
        settings: {
          error: settingsError?.message || null,
          hasApiKey: !!settings?.google_api_key,
          hasSearchEngineId: !!settings?.google_search_engine_id,
          createdAt: settings?.created_at || null,
        },
        leads: {
          count: existingLeads?.length || 0,
          error: leadsError?.message || null,
        },
      },
      recommendation:
        !settings?.google_api_key
          ? '⚠️ Google API key is missing. Go to Leads > Settings and enter your Google API key.'
          : !settings?.google_search_engine_id
          ? '⚠️ Google Search Engine ID is missing. Go to Leads > Settings and enter your Search Engine ID.'
          : (jobTitles?.length || 0) === 0
          ? '⚠️ Job titles table is empty. The database migration may not have run successfully.'
          : '✅ All systems ready for auto-search!',
    });
  } catch (error: any) {
    console.error('❌ Test endpoint error:', error);
    return NextResponse.json(
      {
        error: 'Test failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
