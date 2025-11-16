import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// DIAGNOSTIC endpoint - Debug auto-search step by step
export async function POST(request: NextRequest) {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    log('🧪 Starting auto-search diagnostic...');

    // Get credentials from database
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    log('✅ Supabase connected');

    // Get job titles
    const { data: jobTitles, error: jobError } = await supabase
      .from('lead_job_titles')
      .select('title, priority')
      .limit(2);

    log(`📋 Job titles: ${jobTitles?.length || 0} found`);
    if (jobTitles && jobTitles.length > 0) {
      log(`   Sample: ${jobTitles[0].title}`);
    }

    // Get settings
    const { data: settings, error: settingsError } = await supabase
      .from('leads_settings')
      .select('google_api_key, google_search_engine_id')
      .single();

    log(`⚙️ Settings: ${settingsError ? 'ERROR: ' + settingsError.message : 'Found'}`);
    log(`   API Key present: ${!!settings?.google_api_key}`);
    log(`   Search Engine ID present: ${!!settings?.google_search_engine_id}`);

    if (!settings?.google_api_key || !settings?.google_search_engine_id) {
      return NextResponse.json({ error: 'Missing credentials', logs });
    }

    // Test a single Google search
    const testQuery = 'Event Coordinator Los Angeles CA';
    log(`\n🔍 Testing query: "${testQuery}"`);

    const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
    searchUrl.searchParams.append('q', testQuery);
    searchUrl.searchParams.append('key', settings.google_api_key);
    searchUrl.searchParams.append('cx', settings.google_search_engine_id);
    searchUrl.searchParams.append('num', '3');

    log(`📡 URL: ${searchUrl.toString().replace(settings.google_api_key, 'HIDDEN')}`);
    log('⏳ Sending request to Google...');

    try {
      const response = await axios.get(searchUrl.toString(), { timeout: 10000 });
      
      log(`✅ Google responded with status: ${response.status}`);
      log(`📊 Results count: ${response.data.items?.length || 0}`);
      
      if (response.data.items && response.data.items.length > 0) {
        log(`\n📄 First result:`);
        log(`   Title: ${response.data.items[0].title}`);
        log(`   Link: ${response.data.items[0].link}`);
        log(`   Snippet: ${response.data.items[0].snippet?.substring(0, 100)}...`);
      } else {
        log('\n⚠️ Google returned 0 results for this query');
        log('   This could mean:');
        log('   1. Search Engine is configured for specific sites only');
        log('   2. Query is too specific');
        log('   3. No indexed pages match the query');
      }

      if (response.data.error) {
        log(`\n❌ Google error: ${response.data.error.code} - ${response.data.error.message}`);
      }

      return NextResponse.json({
        status: 'success',
        logs,
        resultsFound: response.data.items?.length || 0,
        googleResponse: {
          status: response.status,
          searchTime: response.data.searchInformation?.searchTime,
          totalResults: response.data.searchInformation?.totalResults,
        },
      });
    } catch (googleError: any) {
      log(`\n❌ Google request failed:`);
      log(`   Status: ${googleError.response?.status}`);
      log(`   Error: ${googleError.message}`);
      
      if (googleError.response?.data?.error) {
        log(`   Google error code: ${googleError.response.data.error.code}`);
        log(`   Google error message: ${googleError.response.data.error.message}`);
      }

      return NextResponse.json(
        {
          error: 'Google request failed',
          logs,
          details: {
            status: googleError.response?.status,
            message: googleError.message,
            googleError: googleError.response?.data?.error,
          },
        },
        { status: googleError.response?.status || 500 }
      );
    }
  } catch (error: any) {
    log(`\n❌ Fatal error: ${error.message}`);
    return NextResponse.json(
      { error: error.message, logs },
      { status: 500 }
    );
  }
}
