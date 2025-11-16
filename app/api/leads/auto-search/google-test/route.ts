import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * TEST Google API directly
 * This verifies that Google Custom Search is working with database credentials
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Google Custom Search API with database credentials...');

    // Get credentials from Supabase database
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: settings, error: settingsError } = await supabase
      .from('leads_settings')
      .select('google_api_key, google_search_engine_id')
      .single();

    console.log('📝 Database check:');
    console.log('   Error:', settingsError?.message || 'none');
    console.log('   Has API key:', !!settings?.google_api_key);
    console.log('   Has Search Engine ID:', !!settings?.google_search_engine_id);

    if (!settings?.google_api_key || !settings?.google_search_engine_id) {
      return NextResponse.json({
        error: 'Google API credentials not in database',
        note: 'Go to Leads > Settings and add your Google API key and Search Engine ID',
      });
    }

    const apiKey = settings.google_api_key;
    const searchEngineId = settings.google_search_engine_id;

    // Make a simple test query to Google
    const query = 'Event Coordinator Los Angeles CA';
    const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
    searchUrl.searchParams.append('q', query);
    searchUrl.searchParams.append('key', apiKey);
    searchUrl.searchParams.append('cx', searchEngineId);
    searchUrl.searchParams.append('num', '3');

    console.log('🔍 Testing query:', query);
    console.log('📡 Request URL:', searchUrl.toString().replace(apiKey, 'HIDDEN_KEY'));

    const response = await axios.get(searchUrl.toString(), {
      timeout: 10000,
    });

    const data = response.data;

    console.log('✅ Google API responded');
    console.log('   Status:', response.status);
    console.log('   Results count:', data.items?.length || 0);
    console.log('   Queries:', data.queries);

    return NextResponse.json({
      status: 'success',
      message: `Google API responded with ${data.items?.length || 0} results`,
      resultsCount: data.items?.length || 0,
      totalResults: data.searchInformation?.totalResults || 'unknown',
      sampleResults: data.items?.slice(0, 2).map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      })) || [],
    });
  } catch (error: any) {
    console.error('❌ Google API test failed:', error.message);

    if (error.response?.status === 403) {
      return NextResponse.json(
        {
          error: 'Google API Access Denied (403)',
          message: 'Your API key or Search Engine ID may be invalid, or you have not enabled the Custom Search API in Google Cloud Console',
          details: error.response.data,
        },
        { status: 403 }
      );
    }

    if (error.response?.status === 401) {
      return NextResponse.json(
        {
          error: 'Google API Unauthorized (401)',
          message: 'Invalid API key',
        },
        { status: 401 }
      );
    }

    if (error.code === 'ECONNABORTED') {
      return NextResponse.json(
        {
          error: 'Timeout',
          message: 'Google API took too long to respond',
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      {
        error: 'Google API test failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
