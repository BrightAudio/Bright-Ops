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

    // Look for contact names near "contact", "director", "manager", "coordinator" keywords
    const namePatterns = [
      /(?:contact|director|manager|coordinator|events?|pastor|minister|reverend|rabbi|imam)\s*:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
      /([A-Z][a-z]+\s+[A-Z][a-z]+)[\s,]*(?:event|venue|av|audio|production|pastor|minister|worship)\s+(?:manager|director|coordinator|leader)/gi
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
      /(production\s+(?:manager|director))/gi,
      /(pastor|minister|reverend|rabbi|imam|worship\s+(?:leader|director|coordinator))/gi
    ];

    let title = '';
    for (const pattern of titlePatterns) {
      const match = pattern.exec(text);
      if (match && match[1]) {
        title = match[1].trim();
        break;
      }
    }

    // Extract phone number near the contact's email or name (not just any phone on page)
    let contactPhone: string | undefined;
    
    if (contactEmail || contactName) {
      // Find phone number within 200 characters of email or name
      const searchTerm = contactEmail || contactName;
      const searchIndex = text.toLowerCase().indexOf(searchTerm.toLowerCase());
      
      if (searchIndex !== -1) {
        // Get text around the email/name (200 chars before and after)
        const contextStart = Math.max(0, searchIndex - 200);
        const contextEnd = Math.min(text.length, searchIndex + searchTerm.length + 200);
        const context = text.substring(contextStart, contextEnd);
        
        // Look for phone in this context
        const phoneRegex = /(\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})/;
        const phoneMatch = context.match(phoneRegex);
        
        if (phoneMatch) {
          contactPhone = `(${phoneMatch[2]}) ${phoneMatch[3]}-${phoneMatch[4]}`;
        }
      }
    }
    
    // Fallback: look for labeled phone numbers (direct line, office, etc.)
    if (!contactPhone) {
      const labeledPhonePatterns = [
        /(?:phone|tel|telephone|call|mobile|cell|direct|office)\s*:?\s*(\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})/i,
      ];
      
      for (const pattern of labeledPhonePatterns) {
        const match = text.match(pattern);
        if (match) {
          contactPhone = `(${match[2]}) ${match[3]}-${match[4]}`;
          break;
        }
      }
    }

    return {
      email: contactEmail,
      contactName,
      title,
      phone: contactPhone
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
    /(operations\s+(?:manager|director))/gi,
    /(pastor|minister|reverend|rabbi|imam|worship\s+(?:leader|director|coordinator))/gi
  ];

  for (const pattern of titlePatterns) {
    const match = pattern.exec(snippet);
    if (match && match[1]) {
      return match[1];
    }
  }

  return '';
}
