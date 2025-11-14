import axios from 'axios';
import * as cheerio from 'cheerio';

export async function fetchPageContacts(url: string): Promise<{
  email?: string;
  contactName?: string;
  title?: string;
  phone?: string;
  organization?: string;
  venue?: string;
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
      /(?:title|role|position)\s*:?\s*([^\n]+)/i,
      /(?:event|venue|production|audio|av)\s+(coordinator|manager|director|specialist)/i,
    ];

    let title = '';
    for (const pattern of titlePatterns) {
      const match = pattern.exec(text);
      if (match && match[1]) {
        title = match[1].trim().split('\n')[0];
        break;
      }
    }

    return {
      email: contactEmail,
      contactName: contactName || undefined,
      title: title || undefined,
      phone: phones[0] || undefined,
    };
  } catch (error) {
    console.error(`Error fetching page ${url}:`, error);
    return {};
  }
}

// Extract business name from title
export function extractBusinessName(title: string): string {
  // Remove common suffixes
  return title
    .replace(/\s*[-–]\s*.*$/, '') // Remove everything after dash
    .replace(/\|\s*.*$/, '') // Remove everything after pipe
    .trim();
}

// Extract name from search result title
export function extractNameFromTitle(title: string): string {
  const matches = title.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)/);
  return matches ? matches[0] : '';
}

// Extract title/role from search snippet
export function extractTitleFromSnippet(snippet: string): string {
  const titlePatterns = [
    /(?:is|was)\s+(?:an?\s+)?([^,.]+?(?:manager|director|coordinator|specialist|officer))[,.]/i,
    /([^,.]+?(?:event|venue|production|audio|av)\s+(?:manager|director|coordinator))/i,
  ];

  for (const pattern of titlePatterns) {
    const match = pattern.exec(snippet);
    if (match) {
      return match[1].trim();
    }
  }

  return '';
}
