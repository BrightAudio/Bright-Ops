import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { fetchPageContacts, extractBusinessName } from '@/lib/utils/contactExtractor';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { city, state, radius } = await request.json();

    if (!city || !state) {
      return NextResponse.json(
        { error: 'City and state are required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // Get all active job titles from the database
    const { data: jobTitles, error: jobError } = await supabase
      .from('lead_job_titles')
      .select('title, category, priority')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (jobError) throw jobError;

    if (!jobTitles || jobTitles.length === 0) {
      return NextResponse.json(
        { error: 'No job titles found in database' },
        { status: 400 }
      );
    }

    // Get Google API settings
    const { data: settings, error: settingsError } = await supabase
      .from('leads_settings')
      .select('google_api_key, google_search_engine_id')
      .single();

    if (settingsError || !settings?.google_api_key || !settings?.google_search_engine_id) {
      return NextResponse.json(
        { error: 'Google API credentials not configured. Please set them in Settings.' },
        { status: 400 }
      );
    }

    const allLeads: any[] = [];
    const searchedQueries = new Set<string>();

    // Search for each job title
    for (const jobTitle of jobTitles.slice(0, 5)) { // Limit to first 5 to avoid rate limiting
      const query = `${jobTitle.title} ${city} ${state}`;

      if (searchedQueries.has(query)) continue;
      searchedQueries.add(query);

      try {
        // Search Google Custom Search
        const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
        searchUrl.searchParams.append('q', query);
        searchUrl.searchParams.append('key', settings.google_api_key);
        searchUrl.searchParams.append('cx', settings.google_search_engine_id);
        searchUrl.searchParams.append('num', '5');

        const searchResponse = await axios.get(searchUrl.toString());
        const searchData = searchResponse.data;

        if (searchData.items) {
          // Extract contacts from the top results
          for (const item of searchData.items.slice(0, 3)) {
            try {
              const pageContacts = await fetchPageContacts(item.link);
              
              if (pageContacts.email) {
                const lead = {
                  name: pageContacts.contactName || 'Unknown',
                  email: pageContacts.email,
                  phone: pageContacts.phone || null,
                  title: pageContacts.title || jobTitle.title,
                  org: extractBusinessName(item.title),
                  venue: null,
                  snippet: item.snippet || null,
                  status: 'uncontacted',
                  source: 'google_auto_search',
                };

                // Avoid duplicates
                const isDuplicate = allLeads.some(l => l.email === lead.email);
                if (!isDuplicate) {
                  allLeads.push(lead);
                }
              }
            } catch (pageError) {
              // Continue if page scraping fails
              console.error(`Failed to scrape ${item.link}:`, pageError);
            }
          }
        }
      } catch (searchError) {
        console.error(`Search failed for "${query}":`, searchError);
        // Continue with next job title
      }

      // Rate limiting - wait between searches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      message: `Found ${allLeads.length} leads in ${city}, ${state}`,
      leads: allLeads,
    });
  } catch (error: any) {
    console.error('Auto-search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search for leads' },
      { status: 500 }
    );
  }
}
