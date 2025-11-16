import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { city, state, radius, keywords } = await request.json();

    console.log('🔍 Auto-search request:', { city, state, radius, keywords });

    if (!city || !state) {
      return NextResponse.json(
        { error: 'City and state are required' },
        { status: 400 }
      );
    }

    // Use service role key (admin) to read job titles and settings
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all active job titles from the database
    const { data: jobTitles, error: jobError } = await supabase
      .from('lead_job_titles')
      .select('title, category, priority')
      .order('priority', { ascending: false });

    console.log('📋 Job titles fetched:', jobTitles?.length || 0, 'titles');
    console.log('❌ Job titles error:', jobError);

    if (jobError) throw jobError;

    if (!jobTitles || jobTitles.length === 0) {
      console.log('⚠️ No job titles found');
      return NextResponse.json(
        { error: 'No job titles found in database' },
        { status: 400 }
      );
    }

    // Get search keywords if provided
    const { data: searchKeywords, error: keywordError } = await supabase
      .from('lead_search_keywords')
      .select('keyword');

    const defaultKeywords = [
      'event booking',
      'rental coordination',
      'venue rentals',
      'facility rentals',
      'special events',
      'public programs',
      'museum events',
      'arts and culture events',
      'weddings corporate events',
      'audio visual services'
    ];

    const keywordList = searchKeywords?.map(k => k.keyword) || defaultKeywords;
    console.log('🔑 Using keywords:', keywordList);

    // Get Google API settings - check environment variables first, then database
    const googleApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const googleSearchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

    // If not in env, try to get from database
    let settings = null;
    if (!googleApiKey || !googleSearchEngineId) {
      const { data } = await supabase
        .from('leads_settings')
        .select('google_api_key, google_search_engine_id')
        .single();
      settings = data;
    }

    const apiKey = googleApiKey || settings?.google_api_key;
    const searchEngineId = googleSearchEngineId || settings?.google_search_engine_id;

    console.log('⚙️ Settings found:', !!apiKey, !!searchEngineId);

    if (!apiKey || !searchEngineId) {
      console.log('❌ Missing Google credentials');
      return NextResponse.json(
        { error: 'Google API credentials not configured. Add GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_ENGINE_ID to .env.local' },
        { status: 400 }
      );
    }

    const allLeads: any[] = [];
    const searchedQueries = new Set<string>();

    console.log('🚀 Starting search with', jobTitles.slice(0, 5).length, 'job titles...');

    // Search for each job title
    for (const jobTitle of jobTitles.slice(0, 5)) {
      // Build query with optional keywords
      let query = `${jobTitle.title} ${city} ${state}`;
      
      // If keywords provided, add them to make search more specific
      if (keywords && keywords.length > 0) {
        query = `${query} (${keywords.join(' OR ')})`;
      }

      if (searchedQueries.has(query)) continue;
      searchedQueries.add(query);

      console.log(`🔎 Searching: "${query}"`);

      try {
        // Search Google Custom Search
        const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
        searchUrl.searchParams.append('q', query);
        searchUrl.searchParams.append('key', apiKey);
        searchUrl.searchParams.append('cx', searchEngineId);
        searchUrl.searchParams.append('num', '5');

        console.log('📡 Google API URL:', searchUrl.toString().replace(apiKey, 'HIDDEN_KEY'));
        console.log('🔑 Using API key:', apiKey.substring(0, 10) + '...');
        console.log('🔑 Using Search Engine ID:', searchEngineId);

        const searchResponse = await axios.get(searchUrl.toString(), { timeout: 8000 });
        const searchData = searchResponse.data;

        console.log(`✅ Google API response status: ${searchResponse.status}`);
        console.log(`📊 Google returned ${searchData.items?.length || 0} results for "${jobTitle.title}"`);

        if (searchData.items) {
          // Convert Google search results to leads directly (no page scraping)
          for (const item of searchData.items.slice(0, 3)) {
            try {
              // Extract domain from URL for email suggestion
              const urlObj = new URL(item.link);
              const domain = urlObj.hostname.replace('www.', '');
              
              // Create a lead from the search result
              const lead = {
                name: 'Contact',
                email: `info@${domain}`,
                phone: null,
                title: jobTitle.title,
                org: item.title || domain,
                venue: null,
                snippet: item.snippet || null,
                status: 'uncontacted',
                source: 'google_auto_search',
              };

              console.log(`✅ Found lead: ${lead.org} (${lead.email})`);

              // Avoid duplicates
              const isDuplicate = allLeads.some(l => l.email === lead.email);
              if (!isDuplicate) {
                allLeads.push(lead);
              }
            } catch (pageError) {
              console.error(`Failed to process ${item.link}:`, pageError);
            }
          }
        }
      } catch (searchError: any) {
        console.error(`❌ Search failed for "${query}":`, {
          status: searchError.response?.status,
          statusText: searchError.response?.statusText,
          errorMessage: searchError.message,
          responseData: searchError.response?.data,
        });
      }

      // Rate limiting - wait between searches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✨ Search complete! Found ${allLeads.length} total leads`);

    return NextResponse.json({
      message: `Found ${allLeads.length} leads in ${city}, ${state}`,
      leads: allLeads,
    });
  } catch (error: any) {
    console.error('❌ Auto-search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search for leads' },
      { status: 500 }
    );
  }
}
