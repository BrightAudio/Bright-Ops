import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import * as cheerio from 'cheerio';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, maxResults = 10 } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Search query required' }, { status: 400 });
    }

    // Get Google API settings
    const { data: settings, error: settingsError } = await supabase
      .from('leads_settings')
      .select('google_api_key, google_search_engine_id')
      .single();

    if (settingsError || !(settings as any)?.google_api_key) {
      return NextResponse.json({ 
        error: 'Google API key not configured. Please add it in Settings.' 
      }, { status: 400 });
    }

    const apiKey = (settings as any).google_api_key;
    const searchEngineId = (settings as any).google_search_engine_id;

    if (!searchEngineId) {
      return NextResponse.json({ 
        error: 'Google Search Engine ID not configured. Please add it in Settings.' 
      }, { status: 400 });
    }

    // Search Google Custom Search API
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=${maxResults}`;
    
    const response = await axios.get(searchUrl);
    const results = response.data.items || [];

    // Process each result to extract contact information
    const leads: any[] = [];
    
    for (const result of results) {
      try {
        // Extract basic info from search result
        const businessName = extractBusinessName(result.title);
        const url = result.link;

        // Fetch the actual webpage to find contact details
        const pageData = await fetchPageContacts(url);

        // Create lead object
        const lead = {
          name: pageData.contactName || extractNameFromTitle(result.title),
          email: pageData.email,
          org: businessName,
          title: pageData.title || extractTitleFromSnippet(result.snippet),
          snippet: result.snippet,
          website: url,
          phone: pageData.phone,
          source: `Google Search: "${query}"`,
        };

        // Only add if we found at least an email
        if (lead.email) {
          leads.push(lead);
        }
      } catch (error) {
        console.error(`Error processing result ${result.link}:`, error);
        // Continue with next result
      }
    }

    return NextResponse.json({ 
      leads,
      query,
      resultsFound: leads.length,
      message: `Found ${leads.length} leads with contact information`
    });

  } catch (error: any) {
    console.error('Error searching Google:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search Google' },
      { status: 500 }
    );
  }
}

// Helper function to fetch and extract contact details from a webpage
async function fetchPageContacts(url: string): Promise<{
  email?: string;
  contactName?: string;
  title?: string;
  phone?: string;
}> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const text = $('body').text();

    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailRegex) || [];
    
    // Filter out common non-contact emails
    const contactEmail = emails.find(email => 
      !email.includes('example.com') && 
      !email.includes('mailto:') &&
      !email.includes('noreply') &&
      !email.includes('privacy') &&
      !email.includes('support@')
    );

    // Extract phone numbers
    const phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phones = text.match(phoneRegex) || [];

    // Look for contact names near "contact", "director", "manager", "coordinator" keywords
    const namePatterns = [
      /(?:contact|director|manager|coordinator|events?)\s*:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
      /([A-Z][a-z]+\s+[A-Z][a-z]+)[\s,]*(?:event|venue|av|audio|production)\s+(?:manager|director|coordinator)/gi
    ];

    let contactName = '';
    for (const pattern of namePatterns) {
      const match = pattern.exec(text);
      if (match && match[1]) {
        contactName = match[1].trim();
        break;
      }
    }

    // Extract title from common patterns
    const titlePatterns = [
      /(?:title|position):\s*([^<\n]+)/i,
      /(event\s+(?:manager|director|coordinator|planner))/gi,
      /(venue\s+(?:manager|director))/gi,
      /(av\s+(?:manager|director|coordinator))/gi,
      /(production\s+(?:manager|director))/gi
    ];

    let title = '';
    for (const pattern of titlePatterns) {
      const match = pattern.exec(text);
      if (match && match[1]) {
        title = match[1].trim();
        break;
      }
    }

    return {
      email: contactEmail,
      contactName,
      title,
      phone: phones[0]
    };

  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return {};
  }
}

// Extract business name from Google search result title
function extractBusinessName(title: string): string {
  // Remove common suffixes
  const cleaned = title
    .replace(/\s*[-|]\s*(Home|Contact|About|Events).*$/i, '')
    .replace(/\s*[-|]\s*Official Site.*$/i, '')
    .trim();
  
  return cleaned;
}

// Extract name from title if it contains a person's name
function extractNameFromTitle(title: string): string {
  // Look for patterns like "John Smith - Event Manager"
  const nameMatch = title.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)\s*[-|]/);
  return nameMatch ? nameMatch[1] : '';
}

// Extract job title from Google snippet
function extractTitleFromSnippet(snippet: string): string {
  const titlePatterns = [
    /(event\s+(?:manager|director|coordinator|planner))/gi,
    /(venue\s+(?:manager|director))/gi,
    /(av\s+(?:manager|director|coordinator))/gi,
    /(production\s+(?:manager|director))/gi,
    /(operations\s+(?:manager|director))/gi
  ];

  for (const pattern of titlePatterns) {
    const match = pattern.exec(snippet);
    if (match && match[1]) {
      return match[1];
    }
  }

  return '';
}
