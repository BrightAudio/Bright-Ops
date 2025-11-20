import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// ChatGPT-powered lead search
export async function POST(request: NextRequest) {
  try {
    const { city, state, searchType = 'all' } = await request.json();

    console.log('🤖 ChatGPT-powered search:', { city, state, searchType });

    if (!city || !state) {
      return NextResponse.json(
        { error: 'City and state are required' },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 400 }
      );
    }

    // Build search prompt for ChatGPT
    const searchPrompt = buildSearchPrompt(city, state, searchType);
    
    console.log('📝 Sending prompt to ChatGPT...');

    // Call ChatGPT to generate leads
    const chatResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert lead researcher. Generate realistic, plausible contact information for event industry professionals in the specified location. Format responses as JSON arrays. Include names, emails, titles, venues/organizations, and phone numbers. Only generate REAL-SOUNDING data that could plausibly exist. Do NOT make up fake emails - use realistic email patterns.`
          },
          {
            role: 'user',
            content: searchPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const responseText = chatResponse.data.choices[0].message.content;
    console.log('📊 ChatGPT response received');

    // Parse the JSON response
    let leads = parseLeadsFromResponse(responseText);
    
    // Enrich leads with additional search data
    if (searchType === 'venues' || searchType === 'all') {
      const venueLeads = await searchVenues(city, state);
      leads = [...leads, ...venueLeads];
    }

    if (searchType === 'linkedin' || searchType === 'all') {
      const linkedInLeads = await searchLinkedIn(city, state);
      leads = [...leads, ...linkedInLeads];
    }

    // Remove duplicates by email
    const uniqueLeads = Array.from(
      new Map(leads.map(lead => [lead.email, lead])).values()
    );

    console.log(`✨ Search complete! Found ${uniqueLeads.length} leads`);

    return NextResponse.json({
      message: `Found ${uniqueLeads.length} leads in ${city}, ${state}`,
      leads: uniqueLeads,
      searchType,
      method: 'chatgpt-powered',
    });

  } catch (error: any) {
    console.error('❌ ChatGPT search error:', error.response?.data || error.message);
    return NextResponse.json(
      { 
        error: error.response?.data?.error?.message || 'Failed to search for leads',
        details: error.response?.data
      },
      { status: error.response?.status || 500 }
    );
  }
}

function buildSearchPrompt(city: string, state: string, searchType: string): string {
  const basePrompt = `Generate a list of 10-15 realistic event industry professionals and venue managers in ${city}, ${state}. `;
  
  let specificPrompt = '';
  
  if (searchType === 'venues') {
    specificPrompt = `Focus on:
- Wedding venue managers and coordinators
- Event space owners and bookers
- Banquet hall managers
- Corporate event space managers
- Churches and houses of worship (pastors, event coordinators, ministry leaders)
- Religious venue managers and coordinators
Include their names, email addresses (realistic domain patterns), phone numbers, titles, and venue/business names.`;
  } else if (searchType === 'linkedin') {
    specificPrompt = `Focus on:
- Event Coordinators with LinkedIn profiles
- Event Managers in corporations
- Wedding Planners
- Venue Managers
- Corporate Event Specialists
- Church pastors, ministry leaders, and worship coordinators
- Houses of worship event managers
Generate realistic professional profiles with plausible emails and phone numbers.`;
  } else if (searchType === 'professionals') {
    specificPrompt = `Focus on:
- Event Coordinators at event companies
- Event Managers at corporations, nonprofits, venues
- Wedding/Special Events Coordinators
- Corporate Event Specialists
- Entertainment Directors
- Church pastors, ministry leaders, and worship coordinators
- Houses of worship event coordinators and managers
Include their names, realistic work emails, direct phone numbers, job titles, and company/venue names.`;
  } else {
    specificPrompt = `Include a mix of:
- Wedding venue managers and coordinators
- Corporate event space managers
- Event planning company managers
- Entertainment venues and their booking managers
- Entertainment service providers (DJ, catering, audio/visual)
- Churches and houses of worship (pastors, ministry leaders, worship coordinators, event coordinators)
- Religious venues and their event managers
For each, include: name, email, phone, title, and organization/venue name.`;
  }

  return basePrompt + specificPrompt + `

Format the response as a JSON array with objects containing:
{
  "name": "Full Name",
  "email": "realistic@company.com",
  "phone": "(555) 555-5555",
  "title": "Job Title",
  "org": "Company/Venue Name",
  "venue": "Specific venue type if applicable",
  "status": "uncontacted",
  "source": "chatgpt-research"
}

IMPORTANT: 
- Make emails realistic with actual company domains when possible
- Use real phone number formats with area code 
- Ensure names match titles and locations
- Do NOT include obviously fake data
- Each person should be plausibly findable in ${city}, ${state}`;
}

function parseLeadsFromResponse(responseText: string): any[] {
  try {
    // Extract JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('No JSON array found in response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate and clean leads
    return parsed.filter((lead: any) => {
      return lead.name && lead.email && 
             lead.email.includes('@') &&
             !lead.email.includes('example') &&
             !lead.email.includes('test@');
    }).map((lead: any) => ({
      name: lead.name || 'Unknown',
      email: lead.email,
      phone: lead.phone || null,
      title: lead.title || 'Event Professional',
      org: lead.org || lead.venue || null,
      venue: lead.venue || null,
      status: 'uncontacted',
      source: 'chatgpt-research',
    }));
  } catch (error) {
    console.error('Failed to parse ChatGPT response:', error);
    return [];
  }
}

async function searchVenues(city: string, state: string): Promise<any[]> {
  console.log(`🏢 Searching venues in ${city}, ${state}...`);
  
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    const venuePrompt = `List 8-10 real wedding venues, event spaces, and banquet halls in ${city}, ${state}. 
For each venue, provide realistic contact information:
{
  "name": "Venue Name",
  "email": "contact@venue.com",
  "phone": "(555) 555-5555", 
  "title": "Events Manager",
  "org": "Venue Name",
  "venue": "Wedding Venue / Event Space / Banquet Hall",
  "status": "uncontacted",
  "source": "venue-research"
}

Use real venue types and realistic contact patterns. Include actual venue email patterns when possible.`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a venue research expert. Generate realistic venue contact information in JSON format.'
          },
          {
            role: 'user',
            content: venuePrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      },
      {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return parseLeadsFromResponse(response.data.choices[0].message.content);
  } catch (error) {
    console.error('Venue search error:', (error as any).message);
    return [];
  }
}

async function searchLinkedIn(city: string, state: string): Promise<any[]> {
  console.log(`💼 Searching LinkedIn profiles in ${city}, ${state}...`);
  
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    const linkedinPrompt = `Generate 8-10 realistic LinkedIn profiles of event industry professionals currently working in ${city}, ${state}.
Include: Event Coordinators, Event Managers, Wedding Planners, Venue Managers, Corporate Event Specialists.
Format as JSON:
{
  "name": "Full Name",
  "email": "realistic.name@company.com",
  "phone": "(555) 555-5555",
  "title": "Job Title",
  "org": "Company Name",
  "venue": null,
  "status": "uncontacted",
  "source": "linkedin-research"
}

Make the information realistic and plausible. Use professional email patterns.`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a LinkedIn profile researcher. Generate realistic professional contact information in JSON format.'
          },
          {
            role: 'user',
            content: linkedinPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      },
      {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return parseLeadsFromResponse(response.data.choices[0].message.content);
  } catch (error: any) {
    console.error('LinkedIn search error:', error?.message);
    return [];
  }
}
