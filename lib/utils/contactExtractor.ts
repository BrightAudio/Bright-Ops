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
    
    // Fallback: if no phone found near contact, look for labeled phone numbers
    if (!contactPhone) {
      const labeledPhonePatterns = [
        /(?:phone|tel|telephone|call|mobile|cell)\s*:?\s*(\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})/i,
        /(?:direct|office)\s*:?\s*(\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})/i,
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
      contactName: contactName || undefined,
      title: title || undefined,
      phone: contactPhone,
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
