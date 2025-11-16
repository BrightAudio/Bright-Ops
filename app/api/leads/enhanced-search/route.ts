import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Enhanced auto-search with venue targeting and LinkedIn integration
export async function POST(request: NextRequest) {
  try {
    const { city, state, radius, searchType = 'all' } = await request.json();

    console.log('🔍 Enhanced auto-search request:', { city, state, radius, searchType });

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

    // Get Google API settings
    const { data: settings, error: settingsError } = await supabase
      .from('leads_settings')
      .select('google_api_key, google_search_engine_id')
      .single();

    if (!settings?.google_api_key || !settings?.google_search_engine_id) {
      return NextResponse.json(
        { error: 'Google API credentials not configured.' },
        { status: 400 }
      );
    }

    const allLeads: any[] = [];

    // Define targeted search strategies
    const searchStrategies = {
      venues: [
        `"wedding venues" ${city} ${state} contact`,
        `"event venues" ${city} ${state} "contact us"`,
        `"banquet halls" ${city} ${state} events`,
        `"conference centers" ${city} ${state} booking`,
        `"event spaces" ${city} ${state} rental`,
        `"corporate event venues" ${city} ${state}`,
        `"reception halls" ${city} ${state}`,
      ],
      linkedin: [
        `site:linkedin.com/in "Event Coordinator" ${city} ${state}`,
        `site:linkedin.com/in "Event Manager" ${city} ${state}`,
        `site:linkedin.com/in "Venue Manager" ${city} ${state}`,
        `site:linkedin.com/in "Wedding Coordinator" ${city} ${state}`,
        `site:linkedin.com/in "Corporate Events" ${city} ${state}`,
      ],
      contactPages: [
        `"Event Coordinator" ${city} ${state} site:*/contact`,
        `"Event Manager" ${city} ${state} "contact us"`,
        `"Venue Manager" ${city} ${state} inurl:contact`,
        `"Wedding Planner" ${city} ${state} "get in touch"`,
      ],
      industry: [
        `"event planning companies" ${city} ${state}`,
        `"wedding planners" ${city} ${state}`,
        `"corporate event services" ${city} ${state}`,
        `"party planners" ${city} ${state}`,
        `"event production companies" ${city} ${state}`,
      ]
    };

    // Select search strategy based on searchType
    let queries: string[] = [];
    if (searchType === 'venues') {
      queries = searchStrategies.venues;
    } else if (searchType === 'linkedin') {
      queries = searchStrategies.linkedin;
    } else if (searchType === 'contacts') {
      queries = searchStrategies.contactPages;
    } else if (searchType === 'industry') {
      queries = searchStrategies.industry;
    } else {
      // 'all' - mix of all strategies
      queries = [
        ...searchStrategies.venues.slice(0, 2),
        ...searchStrategies.linkedin.slice(0, 2),
        ...searchStrategies.contactPages.slice(0, 2),
        ...searchStrategies.industry.slice(0, 2),
      ];
    }

    console.log(`🎯 Using ${queries.length} targeted search queries for ${searchType}`);

    // Execute searches
    for (const query of queries) {
      try {
        console.log(`🔎 Searching: "${query}"`);

        const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
        searchUrl.searchParams.append('q', query);
        searchUrl.searchParams.append('key', settings.google_api_key);
        searchUrl.searchParams.append('cx', settings.google_search_engine_id);
        searchUrl.searchParams.append('num', '5');

        const searchResponse = await axios.get(searchUrl.toString(), { timeout: 8000 });
        const searchData = searchResponse.data;

        console.log(`📊 Google returned ${searchData.items?.length || 0} results`);

        if (searchData.items) {
          for (const item of searchData.items.slice(0, 3)) {
            try {
              // Enhanced contact extraction
              const pageContacts = await extractEnhancedContacts(item.link, item);
              
              if (pageContacts.contacts.length > 0) {
                for (const contact of pageContacts.contacts) {
                  const lead = {
                    name: contact.name || 'Unknown',
                    email: contact.email,
                    phone: contact.phone || null,
                    title: contact.title || extractTitleFromQuery(query),
                    org: pageContacts.businessName || extractBusinessName(item.title),
                    venue: pageContacts.venueType || null,
                    snippet: item.snippet || null,
                    status: 'uncontacted',
                    source: 'enhanced_auto_search',
                    searchType: searchType,
                    foundVia: determineFoundVia(item.link),
                  };

                  console.log(`✅ Found lead: ${lead.name} (${lead.email}) from ${lead.foundVia}`);

                  // Avoid duplicates
                  const isDuplicate = allLeads.some(l => l.email === lead.email);
                  if (!isDuplicate) {
                    allLeads.push(lead);
                  }
                }
              }
            } catch (pageError) {
              console.error(`Failed to scrape ${item.link}:`, pageError.message);
            }
          }
        }
      } catch (searchError: any) {
        console.error(`❌ Search failed for "${query}":`, {
          status: searchError.response?.status,
          message: searchError.message,
        });
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`✨ Enhanced search complete! Found ${allLeads.length} total leads via ${searchType} strategy`);

    return NextResponse.json({
      message: `Found ${allLeads.length} leads in ${city}, ${state} using ${searchType} search`,
      leads: allLeads,
      searchType,
      queriesUsed: queries.length,
    });
  } catch (error: any) {
    console.error('❌ Enhanced auto-search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search for leads' },
      { status: 500 }
    );
  }
}

// Enhanced contact extraction with venue detection
async function extractEnhancedContacts(url: string, searchItem: any) {
  const contacts: any[] = [];
  let businessName = '';
  let venueType = null;

  try {
    const { default: axios } = await import('axios');
    const { default: cheerio } = await import('cheerio');

    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LeadBot/1.0)',
      },
    });

    const $ = cheerio.load(response.data);
    const text = $('body').text().toLowerCase();

    // Extract business name
    businessName = $('title').text() || searchItem.title || '';

    // Detect venue type
    const venueKeywords = {
      'Wedding Venue': ['wedding', 'bridal', 'reception', 'bride', 'groom'],
      'Corporate Venue': ['corporate', 'conference', 'meeting', 'business'],
      'Event Space': ['event space', 'rental', 'party', 'celebration'],
      'Banquet Hall': ['banquet', 'hall', 'dining'],
      'Hotel/Resort': ['hotel', 'resort', 'hospitality'],
    };

    for (const [type, keywords] of Object.entries(venueKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        venueType = type;
        break;
      }
    }

    // Enhanced email extraction
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = response.data.match(emailPattern) || [];

    const validEmails = emails.filter(email => 
      !email.includes('noreply') && 
      !email.includes('no-reply') &&
      !email.includes('support') &&
      !email.includes('webmaster') &&
      !email.includes('example.com')
    );

    // Enhanced name extraction near contact info
    for (const email of validEmails) {
      const contact = {
        email,
        name: extractNameNearEmail($, email),
        phone: extractPhoneNearEmail($, email),
        title: extractTitleNearEmail($, email),
      };

      contacts.push(contact);
    }

  } catch (error) {
    console.error('Contact extraction error:', error.message);
  }

  return {
    contacts,
    businessName: cleanBusinessName(businessName),
    venueType,
  };
}

// Helper functions
function extractTitleFromQuery(query: string): string {
  const titlePatterns = [
    'Event Coordinator', 'Event Manager', 'Venue Manager', 
    'Wedding Coordinator', 'Corporate Events', 'Event Planner'
  ];
  
  for (const title of titlePatterns) {
    if (query.toLowerCase().includes(title.toLowerCase())) {
      return title;
    }
  }
  return 'Event Professional';
}

function determineFoundVia(url: string): string {
  if (url.includes('linkedin.com')) return 'LinkedIn';
  if (url.includes('contact') || url.includes('about')) return 'Contact Page';
  if (url.includes('venue') || url.includes('event')) return 'Venue Website';
  return 'Business Website';
}

function extractNameNearEmail($: any, email: string): string {
  // Enhanced name extraction logic
  const emailContext = $(`*:contains("${email}")`).parent().text();
  const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
  const names = emailContext.match(namePattern) || [];
  return names[0] || 'Contact Person';
}

function extractPhoneNearEmail($: any, email: string): string | null {
  const emailContext = $(`*:contains("${email}")`).parent().text();
  const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
  const phones = emailContext.match(phonePattern) || [];
  return phones[0] || null;
}

function extractTitleNearEmail($: any, email: string): string | null {
  const emailContext = $(`*:contains("${email}")`).parent().text().toLowerCase();
  const titles = [
    'coordinator', 'manager', 'director', 'planner', 'specialist',
    'owner', 'founder', 'president', 'vice president'
  ];
  
  for (const title of titles) {
    if (emailContext.includes(title)) {
      return title.charAt(0).toUpperCase() + title.slice(1);
    }
  }
  return null;
}

function cleanBusinessName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().substring(0, 100);
}

function extractBusinessName(title: string): string {
  // Extract business name from page title
  return title.split('|')[0].split('-')[0].trim();
}