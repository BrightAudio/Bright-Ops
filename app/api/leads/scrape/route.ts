import { NextRequest, NextResponse } from "next/server";
import axios from 'axios';
import * as cheerio from 'cheerio';
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * POST /api/leads/scrape
 * 
 * Scrapes leads from a provided URL
 * 
 * Request body:
 * {
 *   url: string,  // Website URL to scrape
 *   method?: 'basic' | 'linkedin'  // Scraping method
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   leads: Lead[],
 *   count: number,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, method = 'basic' } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    let scrapedLeads: any[] = [];

    if (method === 'basic') {
      // Basic web scraping using cheerio
      scrapedLeads = await scrapeBasic(url);
    } else if (method === 'linkedin') {
      // LinkedIn-specific scraping (would need LinkedIn API or scraping service)
      return NextResponse.json(
        { error: 'LinkedIn scraping requires API integration. Please use CSV import for now.' },
        { status: 501 }
      );
    }

    if (scrapedLeads.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        leads: [],
        message: 'No leads found on this page. Try a different URL or use CSV import.',
      });
    }

    return NextResponse.json({
      success: true,
      count: scrapedLeads.length,
      leads: scrapedLeads,
      message: `Found ${scrapedLeads.length} potential leads. Review and import.`,
    });

  } catch (error: any) {
    console.error("Error in scrape-leads API:", error);
    return NextResponse.json(
      { 
        error: 'Failed to scrape website',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

async function scrapeBasic(url: string) {
  try {
    // Fetch the webpage
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000, // 10 second timeout
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const leads: any[] = [];

    // Extract emails using regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const pageText = $.text();
    const emailMatches = pageText.match(emailRegex) || [];
    
    // Deduplicate emails
    const uniqueEmails = [...new Set(emailMatches)];

    // Try to find names near emails
    uniqueEmails.forEach((email) => {
      const domain = email.split('@')[1];
      const localPart = email.split('@')[0];
      
      // Try to extract name from email (e.g., john.doe@company.com -> John Doe)
      let name = localPart
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      // Look for the email in the HTML and try to find nearby name
      const emailContext = $(`*:contains("${email}")`).first().text();
      const nameMatch = emailContext.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)/);
      if (nameMatch) {
        name = nameMatch[0];
      }

      leads.push({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        org: domain.split('.')[0],
        title: null,
        snippet: `Scraped from ${url}`,
        status: 'uncontacted',
        source: 'web_scrape',
      });
    });

    return leads;
  } catch (error) {
    console.error('Basic scrape error:', error);
    throw new Error('Failed to fetch or parse webpage');
  }
}

/**
 * GET /api/leads/scrape
 * 
 * Returns status of scraping system
 */
export async function GET() {
  return NextResponse.json({
    status: "ready",
    message: "Lead scraping API is available. Use POST to initiate scraping.",
    supportedKeywords: [
      "Event Coordinator",
      "Event Manager",
      "Venue Manager",
      "Museum Curator",
      "Community Engagement Director",
      "Program Director",
      "Special Events Coordinator",
    ],
  });
}
