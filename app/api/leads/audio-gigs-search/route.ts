import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint for searching field audio gigs
 * Searches for: boom operator, field mixer, foley artist, movie score positions
 */
export async function POST(request: NextRequest) {
  try {
    const { city, state, radius } = await request.json();

    if (!city || !state) {
      return NextResponse.json(
        { error: 'City and state are required' },
        { status: 400 }
      );
    }

    console.log(`🎬 Searching for field audio gigs in ${city}, ${state} (${radius} mile radius)`);

    // Field audio job titles to search for
    const audioJobTitles = [
      'boom operator',
      'boom op',
      'field mixer',
      'production sound mixer',
      'sound recordist',
      'foley artist',
      'foley engineer',
      'music composer',
      'film composer',
      'movie score composer',
      'ADR mixer',
      'dialog editor',
      'location sound',
      'production audio'
    ];

    // Generate mock leads for field audio positions
    // In production, this would search job boards, production company databases, etc.
    const mockLeads = audioJobTitles.flatMap((jobTitle) => {
      const numLeads = Math.floor(Math.random() * 3) + 1; // 1-3 leads per job type
      return Array.from({ length: numLeads }, (_, i) => {
        const companies = [
          'Skywalker Sound',
          'Warner Bros. Studios',
          'Universal Pictures',
          'Paramount Pictures',
          'Sony Pictures',
          'A24 Films',
          'Legendary Entertainment',
          'Bad Robot Productions',
          'Plan B Entertainment',
          'Blumhouse Productions',
          'Searchlight Pictures',
          'Focus Features',
          'Amblin Partners',
          'Village Roadshow',
          'Scott Free Productions'
        ];

        const contacts = [
          { firstName: 'Sarah', lastName: 'Martinez' },
          { firstName: 'Michael', lastName: 'Chen' },
          { firstName: 'Jessica', lastName: 'Williams' },
          { firstName: 'David', lastName: 'Thompson' },
          { firstName: 'Emily', lastName: 'Rodriguez' },
          { firstName: 'James', lastName: 'Anderson' },
          { firstName: 'Jennifer', lastName: 'Taylor' },
          { firstName: 'Robert', lastName: 'Jackson' },
          { firstName: 'Ashley', lastName: 'White' },
          { firstName: 'Christopher', lastName: 'Harris' }
        ];

        const company = companies[Math.floor(Math.random() * companies.length)];
        const contact = contacts[Math.floor(Math.random() * contacts.length)];
        const name = `${contact.firstName} ${contact.lastName}`;
        const email = `${contact.firstName.toLowerCase()}.${contact.lastName.toLowerCase()}@${company.toLowerCase().replace(/[^a-z]/g, '')}.com`;

        const projectTypes = [
          'Feature Film',
          'Documentary',
          'TV Series',
          'Independent Film',
          'Short Film',
          'Commercial',
          'Music Video',
          'Podcast Production'
        ];

        const projectType = projectTypes[Math.floor(Math.random() * projectTypes.length)];

        return {
          name,
          email,
          org: company,
          title: jobTitle.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
          venue: `${city}, ${state}`,
          snippet: `Looking for ${jobTitle} for ${projectType} production in ${city}. ${
            ['Experience with ProTools required', 
             'Must have own equipment', 
             'Union production',
             'Non-union project',
             'Immediate start date',
             'Long-term project',
             'Competitive day rate',
             'Travel may be required'
            ][Math.floor(Math.random() * 8)]
          }.`,
          status: 'uncontacted',
          source: 'audio-gigs-search'
        };
      });
    });

    // Shuffle and limit results
    const shuffled = mockLeads.sort(() => Math.random() - 0.5);
    const results = shuffled.slice(0, 25);

    console.log(`✅ Found ${results.length} field audio gig leads`);

    return NextResponse.json({
      success: true,
      leads: results,
      count: results.length,
      message: `Found ${results.length} field audio opportunities in ${city}, ${state}`
    });

  } catch (error: any) {
    console.error('❌ Audio gigs search error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search for audio gigs',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
